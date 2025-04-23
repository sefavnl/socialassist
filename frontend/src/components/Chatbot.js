import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Chatbot.css';

const Chatbot = () => {
    const [messages, setMessages] = useState([
        { text: "Merhaba! Ben SocialAssist'in motivasyon asistanıyım. Hedeflerin ve kişisel gelişimin konusunda sana yardımcı olabilirim. Nasıl yardımcı olabilirim?", sender: 'bot' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const responseCategories = {
        lowMotivation: {
            keywords: ['enerjim yok', 'moralim bozuk', 'kötü hissediyorum', 'yapmak istemiyorum', 'başaramayacağım', 'sıkıldım', 'vazgeçmek'],
            responses: [
                "Her zaman güçlü olmak zorunda değilsin. Dinlenmek de bir ilerlemedir. 🌱",
                "Unutma, karanlık günlerde bile bir umut ışığı vardır. Sen başarabilirsin! ✨",
                "Nefes al, kendine şans tanı. Bugün zor olabilir ama bu geçici.",
                "Küçük adımlar da büyük yolculuklar başlatır.",
                "Bir gün geriye dönüp baktığında, bu zor günü atlattığın için kendinle gurur duyacaksın.",
                "Vazgeçme. Belki de zirveye en yakın olduğun andasın."
            ]
        },
        procrastination: {
            keywords: ['erteliyorum', 'üşeniyorum', 'nereden başlayacağım', 'yarın yaparım', 'plan yapıyorum'],
            responses: [
                "Mükemmel başlangıçları beklemek yerine, küçük adımlarla başla. 📅",
                "Yapılacak iş küçük bile olsa şimdi başla. Yarın bugünden doğar.",
                "Büyük başarılar, sıradan günlerde alınan kararlarla başlar.",
                "Hedefini 5 dakikalık bir eyleme indir. O ilk 5 dakika seni ileri taşıyacak.",
                "Yarın değil, şimdi başlamak sana daha çok şey kazandırır."
            ]
        },
        support: {
            keywords: ['kimsem yok', 'tek başıma', 'anlaşılmıyorum', 'destek olmuyor', 'yalnızım'],
            responses: [
                "Yalnız değilsin. Buradayım ve senin için buradayım. 🤖💙",
                "En büyük destek, bazen kendi iç sesindir. Ona kulak ver.",
                "Anlaşıldığını hissetmek zor, ama inançla yürümeye devam et. Yarın daha iyi olacak.",
                "Belki çevrendekiler anlamıyor ama bu seni değersiz yapmaz.",
                "Hayatta bazen yalnız yürümek gerekir, ama bu daha güçlü olacağın anlamına gelir."
            ]
        },
        confidence: {
            keywords: ['yeterince iyi değilim', 'yapamam', 'daha iyi', 'güvenim yok', 'başarısız'],
            responses: [
                "Herkes bir yerden başlar. Sen de zamanla daha iyi olacaksın. 🌱",
                "Karşılaştırma değil, gelişim seni mutlu eder.",
                "Başarı, pes etmeyenlerin ödülüdür.",
                "Güvenini yitirme, içindeki potansiyelin farkına var.",
                "Başarısızlık, başarıya giden yoldaki öğretmenindir."
            ]
        },
        dailyMotivation: {
            keywords: ['motivasyon sözü', 'motive et', 'iyi geçsin', 'başarı sözü', 'ilham ver'],
            responses: [
                "Başarı, her gün tekrar tekrar denemeye cesaret edebilmektir. - Winston Churchill",
                "Bugünün işi, yarının zaferini hazırlar.",
                "Senin için küçük olan bir adım, hayalin için dev bir sıçrayış olabilir. 🚀",
                "En iyi zaman şimdi. Harekete geç! ⏰",
                "Kendine inandığın sürece, yolun açık demektir."
            ]
        },
        fun: {
            keywords: ['gaza getir', 'ateşle', 'motivasyon yüklemesi', 'efsane olmalıyım'],
            responses: [
                "RÜZGARI ARKANA AL! Bugün senin günün! 💨🔥",
                "Haydi kral/kraliçe! Bu dünya senin sahnen!",
                "Motivasyon modülü: %100 yüklendi. Şimdi göster kendini!",
                "Bir kahve al, aynaya bak ve kendine 'Ben bu işi hallederim!' de. ✊"
            ]
        }
    };

    const quickReplies = [
        "Motivasyonumu nasıl artırabilirim?",
        "Hedef belirleme konusunda yardım almak istiyorum",
        "Günlük rutin oluşturmak istiyorum",
        "Odaklanma sorunum var",
        "Erteleme alışkanlığımı nasıl yenebilirim?"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const findMatchingResponse = (message) => {
        const lowerMessage = message.toLowerCase();
        for (const category of Object.values(responseCategories)) {
            for (const keyword of category.keywords) {
                if (lowerMessage.includes(keyword)) {
                    return category.responses[Math.floor(Math.random() * category.responses.length)];
                }
            }
        }
        return "Anlıyorum. Biraz daha detay verebilir misin? Seni daha iyi anlayıp yardımcı olabilmek için.";
    };

    const handleQuickReply = (reply) => {
        setInputMessage(reply);
        handleSendMessage({ preventDefault: () => {} }, reply);
    };

    const handleSendMessage = async (e, quickReply = null) => {
        e.preventDefault();
        const messageToSend = quickReply || inputMessage;
        if (!messageToSend.trim()) return;

        const userMessage = { text: messageToSend, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        try {
            // Önce yerel cevapları kontrol et
            const localResponse = findMatchingResponse(messageToSend);
            
            // Eğer yerel cevap bulunamazsa API'ye istek gönder
            if (localResponse === "Anlıyorum. Biraz daha detay verebilir misin?") {
                const response = await axios.post('http://localhost:5000/api/chatbot', {
                    message: messageToSend,
                    context: messages.slice(-3).map(m => m.text)
                });
                const botMessage = { text: response.data.response, sender: 'bot' };
                setMessages(prev => [...prev, botMessage]);
            } else {
                const botMessage = { text: localResponse, sender: 'bot' };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage = { text: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.", sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            <button 
                className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="chatbot-icon">💬</span>
            </button>

            <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
                <div className="chatbot-header">
                    <div className="chatbot-title">
                        <h3>Motivasyon Asistanı</h3>
                        <p>Size nasıl yardımcı olabilirim?</p>
                    </div>
                    <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
                </div>

                <div className="chatbot-messages">
                    {messages.map((message, index) => (
                        <div key={index} className={`message ${message.sender}`}>
                            <div className="message-content">
                                {message.text}
                            </div>
                            <div className="message-time">
                                {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="message bot">
                            <div className="message-content typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {messages.length === 1 && (
                    <div className="quick-replies">
                        {quickReplies.map((reply, index) => (
                            <button
                                key={index}
                                className="quick-reply-button"
                                onClick={() => handleQuickReply(reply)}
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="chatbot-input">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                    />
                    <button type="submit" className="send-button">
                        <span className="send-icon">➤</span>
                    </button>
                </form>
            </div>
        </>
    );
};

export default Chatbot; 