from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import bcrypt
import jwt
from datetime import datetime, timedelta
import traceback
import sys
from bson.objectid import ObjectId
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://socialassist-frontend.onrender.com", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', "mongodb+srv://nozkanca7:sgshcoNN21@cluster0.ipznc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
try:
    print("MongoDB URI:", MONGODB_URI)
    client = MongoClient(MONGODB_URI)
    db = client['motivation_chatbot']
    users = db['users']
    goals = db['goals']
    print("MongoDB bağlantısı başarılı")
except Exception as e:
    print(f"MongoDB bağlantı hatası: {str(e)}")
    print(traceback.format_exc())
    sys.exit(1)

# JWT Secret Key
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'your-secret-key-here')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

# User Registration
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print(f"Kayıt isteği alındı: {data}")
        
        # Check if user already exists
        existing_user = users.find_one({'email': data['email']})
        print(f"Existing user check: {existing_user}")
        
        if existing_user:
            return jsonify({'error': 'User already exists'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        print(f"Hashed password created")
        
        # Create user
        user = {
            'email': data['email'],
            'password': hashed_password,
            'name': data['name'],
            'created_at': datetime.utcnow()
        }
        
        result = users.insert_one(user)
        print(f"Insert result: {result.inserted_id}")
        
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        print(f"Kayıt hatası: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# User Login
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print(f"Giriş isteği alındı: {data}")
        
        user = users.find_one({'email': data['email']})
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        print(f"Found user: {user}")
        print("Checking password")
        
        if bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
            token = jwt.encode({
                'user_id': str(user['_id']),
                'exp': datetime.utcnow() + timedelta(days=1)
            }, app.config['SECRET_KEY'])
            
            return jsonify({
                'token': token,
                'user': {
                    'id': str(user['_id']),
                    'name': user['name'],
                    'email': user['email']
                }
            })
        else:
            return jsonify({'error': 'Invalid password'}), 401
            
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Password Reset Request
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        print(f"Şifre sıfırlama isteği alındı: {data}")
        
        user = users.find_one({'email': data['email']})
        print(f"Found user: {user}")
        
        if user:
            # Generate reset token
            reset_token = jwt.encode({
                'email': user['email'],
                'exp': datetime.utcnow() + timedelta(hours=1)
            }, app.config['SECRET_KEY'])
            
            # Update user with reset token
            users.update_one(
                {'email': user['email']},
                {'$set': {'reset_token': reset_token, 'reset_token_exp': datetime.utcnow() + timedelta(hours=1)}}
            )
            
            # TODO: Send email with reset link
            # For now, just return the token
            return jsonify({
                'message': 'Password reset link sent to your email',
                'reset_token': reset_token  # In production, this should be sent via email
            })
        
        return jsonify({'error': 'Email not found'}), 404
    except Exception as e:
        print(f"Şifre sıfırlama hatası: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Reset Password
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        print(f"Yeni şifre belirleme isteği alındı")
        
        # Verify reset token
        try:
            decoded = jwt.decode(data['token'], app.config['SECRET_KEY'], algorithms=['HS256'])
            user = users.find_one({
                'email': decoded['email'],
                'reset_token': data['token'],
                'reset_token_exp': {'$gt': datetime.utcnow()}
            })
            
            if not user:
                return jsonify({'error': 'Invalid or expired reset token'}), 400
            
            # Hash new password
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
            
            # Update user password and remove reset token
            users.update_one(
                {'email': decoded['email']},
                {
                    '$set': {'password': hashed_password},
                    '$unset': {'reset_token': "", 'reset_token_exp': ""}
                }
            )
            
            return jsonify({'message': 'Password reset successfully'})
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Reset token has expired'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid reset token'}), 400
            
    except Exception as e:
        print(f"Şifre güncelleme hatası: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Add Daily Goal
@app.route('/api/goals', methods=['POST'])
@token_required
def add_goal(current_user):
    try:
        data = request.get_json()
        data['user_id'] = str(current_user['_id'])
        data['created_at'] = datetime.now()
        data['completed'] = False
        
        result = goals.insert_one(data)
        return jsonify({
            'message': 'Goal added successfully',
            'goalId': str(result.inserted_id)
        }), 201
    except Exception as e:
        print(f"Hedef eklenirken hata: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Get User Goals
@app.route('/api/goals', methods=['GET'])
@token_required
def get_goals(current_user):
    try:
        user_goals = list(goals.find({'user_id': str(current_user['_id'])}))
        for goal in user_goals:
            goal['_id'] = str(goal['_id'])
        return jsonify(user_goals)
    except Exception as e:
        print(f"Hedefler getirilirken hata: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Chatbot endpoint
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.get_json()
        user_message = data.get('message', '').lower()
        
        # Motivasyon mesajları
        motivation_messages = [
            "Her gün küçük bir adım at, büyük değişimler yaratabilirsin!",
            "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
            "Hedeflerine ulaşmak için bugün ne yapabilirsin?",
            "Her zorluk, seni daha güçlü yapacak bir fırsattır.",
            "Kendine inan, başaracaksın!",
            "Bugün yapacağın küçük değişiklikler, yarın büyük farklar yaratacak.",
            "Her gün yeni bir başlangıç yapma şansın var.",
            "Hedeflerine ulaşmak için sabırlı ol, her şey zamanla olacak.",
            "Kendini motive et, çünkü sen bunu hak ediyorsun!",
            "Her başarısızlık, başarıya giden yolda bir öğrenme fırsatıdır."
        ]
        
        # Hedef yardımı mesajları
        goal_help_messages = {
            'hedef': [
                "Hedeflerini küçük, ölçülebilir adımlara bölmeyi dene.",
                "Her hedef için bir zaman çizelgesi oluştur.",
                "Hedeflerini yazılı hale getir ve sık sık gözden geçir.",
                "Her gün hedeflerine doğru küçük bir adım at.",
                "Hedeflerini başkalarıyla paylaş, bu seni motive edecektir."
            ],
            'motivasyon': motivation_messages,
            'yardım': [
                "Size nasıl yardımcı olabilirim? Hedefleriniz hakkında konuşmak ister misiniz?",
                "Motivasyon konusunda desteğe mi ihtiyacınız var?",
                "Günlük hedeflerinizi planlamakta yardıma ihtiyacınız var mı?"
            ]
        }
        
        # Kullanıcı mesajına göre yanıt seç
        response = "Size nasıl yardımcı olabilirim?"
        
        for keyword, messages in goal_help_messages.items():
            if keyword in user_message:
                response = messages[0]  # İlk mesajı gönder
                break
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"Chatbot hatası: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Update Goal
@app.route('/api/goals/<goal_id>', methods=['PUT'])
@token_required
def update_goal(current_user, goal_id):
    try:
        data = request.get_json()
        goal = goals.find_one({'_id': ObjectId(goal_id), 'user_id': str(current_user['_id'])})
        
        if not goal:
            return jsonify({'message': 'Goal not found!'}), 404
            
        goals.update_one(
            {'_id': ObjectId(goal_id)},
            {'$set': data}
        )
        return jsonify({'message': 'Goal updated successfully'})
    except Exception as e:
        print(f"Hedef güncellenirken hata: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Delete Goal
@app.route('/api/goals/<goal_id>', methods=['DELETE'])
@token_required
def delete_goal(current_user, goal_id):
    try:
        goal = goals.find_one({'_id': ObjectId(goal_id), 'user_id': str(current_user['_id'])})
        
        if not goal:
            return jsonify({'message': 'Goal not found!'}), 404
            
        goals.delete_one({'_id': ObjectId(goal_id)})
        return jsonify({'message': 'Goal deleted successfully'})
    except Exception as e:
        print(f"Hedef silinirken hata: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 