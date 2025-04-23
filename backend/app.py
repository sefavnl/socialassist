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
        print(f"Found user: {user}")
        
        if user:
            print(f"Checking password")
            if bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
                token = jwt.encode({
                    'email': user['email'],
                    'exp': datetime.utcnow() + timedelta(days=1)
                }, app.config['SECRET_KEY'])
                
                return jsonify({
                    'token': token,
                    'user': {
                        'email': user['email'],
                        'name': user['name']
                    }
                })
        
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Giriş hatası: {str(e)}")
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
def add_goal():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401
    
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        data = request.get_json()
        
        goal = {
            'email': decoded['email'],
            'title': data['title'],
            'description': data['description'],
            'createdAt': datetime.utcnow().isoformat(),
            'completed': False
        }
        
        result = goals.insert_one(goal)
        return jsonify({
            'message': 'Goal added successfully',
            'goalId': str(result.inserted_id)
        })
    
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        print(f"Goal add error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Get User Goals
@app.route('/api/goals', methods=['GET'])
def get_goals():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401
    
    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_goals = list(goals.find({'email': decoded['email']}))
        
        # Convert ObjectId to string for JSON serialization
        for goal in user_goals:
            goal['_id'] = str(goal['_id'])
        
        return jsonify(user_goals)
    
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

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
def update_goal(goal_id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401
    
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        data = request.get_json()
        
        # Update goal
        result = goals.update_one(
            {'_id': ObjectId(goal_id), 'email': decoded['email']},
            {'$set': data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Goal not found or unauthorized'}), 404
            
        return jsonify({'message': 'Goal updated successfully'})
    
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        print(f"Goal update error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Delete Goal
@app.route('/api/goals/<goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401
    
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        
        # Delete goal
        result = goals.delete_one(
            {'_id': ObjectId(goal_id), 'email': decoded['email']}
        )
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Goal not found or unauthorized'}), 404
            
        return jsonify({'message': 'Goal deleted successfully'})
    
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        print(f"Goal delete error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 