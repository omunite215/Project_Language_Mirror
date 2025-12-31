import os
import json
import base64
import asyncio
import logging
import time
from typing import AsyncGenerator, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from functools import wraps
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from google.cloud import speech, translate_v2 as translate
from google.api_core import exceptions as google_exceptions
import google.generativeai as genai
import httpx

# === Setup Logging ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Language Mirror API", version="2.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Configuration ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")

# Rate Limiting Config
RATE_LIMIT_REQUESTS = 20  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds

# === Rate Limiter ===
class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = defaultdict(list)
    
    def is_allowed(self, client_ip: str) -> tuple[bool, Optional[int]]:
        now = time.time()
        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.window
        ]
        
        if len(self.requests[client_ip]) >= self.max_requests:
            oldest = min(self.requests[client_ip])
            retry_after = int(self.window - (now - oldest)) + 1
            return False, retry_after
        
        self.requests[client_ip].append(now)
        return True, None

rate_limiter = RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW)

# === Initialize Clients (Connection Pooling) ===
speech_client = None
translate_client = None
http_client = None

@app.on_event("startup")
async def startup():
    global speech_client, translate_client, http_client
    try:
        speech_client = speech.SpeechClient()
        translate_client = translate.Client()
        http_client = httpx.AsyncClient(timeout=30.0)
        
        # Configure Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        
        logger.info("✅ All clients initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize clients: {e}")

@app.on_event("shutdown")
async def shutdown():
    global http_client
    if http_client:
        await http_client.aclose()
        logger.info("🔌 HTTP client closed")

# === Language Configurations ===
SUPPORTED_LANGUAGES = {
    "italian": {
        "code": "it-IT",
        "name": "Italian",
        "flag": "🇮🇹",
        "translate_code": "it",
        "dialects": {
            "tuscan": {
                "voice_id": "pNInz6obpgDQGcFmaJgB",
                "name": "Sofia",
                "region": "Florence, Tuscany",
                "personality": "Sofia is a 32-year-old art historian - cultured but direct. She appreciates effort but won't sugarcoat mistakes. She'll tell you 'That's not quite right' before explaining why. She has high standards because she knows you can meet them.",
                "greeting": "Ciao! Sono Sofia. Pronto a fare un po' di pratica seria?",
                "speech_quirks": "Uses 'Dunque...', 'Allora...', references Florentine culture, speaks precisely"
            },
            "roman": {
                "voice_id": "ErXwobaYiN019PkySvjV",
                "name": "Marco",
                "region": "Rome",
                "personality": "Marco is a 28-year-old who works at his family's trattoria. He's brutally honest in a friendly way - will laugh at your mistakes but help you fix them. Uses Roman slang and doesn't take things too seriously. If you mess up, expect 'Dai, che hai detto?' (Come on, what did you say?)",
                "greeting": "Ao! Ciao! So' Marco. Vediamo che sai fare, dai!",
                "speech_quirks": "Uses 'Ao!', 'Daje!', 'Che te devo di'?', drops endings, very direct"
            },
            "neapolitan": {
                "voice_id": "VR6AewLTigWG4xSOukaG",
                "name": "Giuseppe",
                "region": "Naples",
                "personality": "Giuseppe is a 45-year-old musician - warm but honest. He'll encourage you but also say 'Mamma mia, no no no' when you mess up badly. He's expressive and dramatic about both praise AND criticism. Expects you to try hard.",
                "greeting": "Uè! Benvenuto! Famme sentì che sai fa'!",
                "speech_quirks": "Very expressive, uses 'Uè!', 'Mamma mia!', dramatic reactions, mixes Neapolitan words"
            }
        }
    },
    "spanish": {
        "code": "es-ES",
        "name": "Spanish",
        "flag": "🇪🇸",
        "translate_code": "es",
        "dialects": {
            "castilian": {
                "voice_id": "pNInz6obpgDQGcFmaJgB",
                "name": "Carmen",
                "region": "Madrid, Spain",
                "personality": "Carmen is a 35-year-old journalist - sharp, witty, and doesn't waste words. She'll point out mistakes immediately but explains them well. Has little patience for lazy attempts but respects genuine effort. Will say 'Bueno, eso no está bien' without hesitation.",
                "greeting": "Hola. Soy Carmen. Vamos a ver qué tal lo haces.",
                "speech_quirks": "Uses 'Vale', 'Bueno', 'A ver...', Castilian lisp, matter-of-fact tone"
            },
            "mexican": {
                "voice_id": "ErXwobaYiN019PkySvjV",
                "name": "Carlos",
                "region": "Mexico City",
                "personality": "Carlos is a 30-year-old designer - friendly but straightforward. He'll say '¿Qué onda con eso?' when confused by your Spanish. Encouraging but honest - won't pretend something was good if it wasn't. Uses humor to soften criticism.",
                "greeting": "¡Qué onda! Soy Carlos. A ver, échale ganas.",
                "speech_quirks": "Uses '¿Qué onda?', 'Órale', 'No manches', casual but clear"
            },
            "argentine": {
                "voice_id": "VR6AewLTigWG4xSOukaG",
                "name": "Martín",
                "region": "Buenos Aires",
                "personality": "Martín is a 38-year-old tango instructor - passionate and opinionated. He'll tell you exactly what he thinks. Uses 'Che, no, así no' when you're wrong. Philosophical about mistakes but expects improvement. Very expressive feedback.",
                "greeting": "Che, ¿qué tal? Soy Martín. Dale, mostrame qué tenés.",
                "speech_quirks": "Uses 'Che', 'Vos', 'Dale', dramatic pauses, Italian-influenced intonation"
            }
        }
    },
    "french": {
        "code": "fr-FR",
        "name": "French",
        "flag": "🇫🇷",
        "translate_code": "fr",
        "dialects": {
            "parisian": {
                "voice_id": "pNInz6obpgDQGcFmaJgB",
                "name": "Amélie",
                "region": "Paris",
                "personality": "Amélie is a 29-year-old fashion editor - elegant but exacting. She notices every mistake and will raise an eyebrow before correcting you. Says 'Hmm, non, pas exactement...' often. Appreciates when you try but has standards. Slightly intimidating but fair.",
                "greeting": "Bonjour. Je suis Amélie. Voyons voir ce que vous savez faire.",
                "speech_quirks": "Uses 'Enfin...', 'Bon...', 'Euh...', slight sighs, precise pronunciation"
            },
            "quebec": {
                "voice_id": "ErXwobaYiN019PkySvjV",
                "name": "Jean-Pierre",
                "region": "Montreal, Quebec",
                "personality": "Jean-Pierre is a 42-year-old hockey coach - gruff but caring. Doesn't sugarcoat anything. Will say 'Ben non, c'est pas ça!' and then patiently explain. Tough love approach. Celebrates real wins, not participation trophies.",
                "greeting": "Salut! Moi c'est Jean-Pierre. Envoye, montre-moi c'que t'as!",
                "speech_quirks": "Uses 'Ben', 'Pantoute', 'Icitte', 'Tabarouette', casual but direct"
            },
            "southern": {
                "voice_id": "VR6AewLTigWG4xSOukaG",
                "name": "Pierre",
                "region": "Marseille, Provence",
                "personality": "Pierre is a 50-year-old chef - warm but no-nonsense. Like in his kitchen, mistakes are learning opportunities but repeated mistakes get called out. Says 'Oh peuchère, non!' when you mess up. Genuine praise when earned.",
                "greeting": "Aïe, bonjour! Moi c'est Pierre. Allez, on voit ce que tu sais!",
                "speech_quirks": "Uses 'Peuchère', 'Fan', elongated vowels, Mediterranean warmth with honesty"
            }
        }
    },
    "german": {
        "code": "de-DE",
        "name": "German",
        "flag": "🇩🇪",
        "translate_code": "de",
        "dialects": {
            "hochdeutsch": {
                "voice_id": "pNInz6obpgDQGcFmaJgB",
                "name": "Anna",
                "region": "Berlin",
                "personality": "Anna is a 34-year-old engineer - precise, logical, and direct. German directness means she tells you exactly what's wrong without softening it. 'Das ist falsch' (That's wrong) followed by clear explanation. Efficient feedback, no fluff.",
                "greeting": "Hallo. Ich bin Anna. Lass uns sehen, wie gut dein Deutsch ist.",
                "speech_quirks": "Uses 'Also...', 'Genau', 'Naja...', very structured explanations"
            },
            "bavarian": {
                "voice_id": "ErXwobaYiN019PkySvjV",
                "name": "Hans",
                "region": "Munich, Bavaria",
                "personality": "Hans is a 48-year-old Biergarten owner - jovial but tells it like it is. Will laugh at bad attempts and say 'Na, des war nix!' (Nope, that was nothing!) but helps you get it right. Honest in a friendly, teasing way.",
                "greeting": "Servus! I bin da Hans. Zeig ma, was'd drauf hast!",
                "speech_quirks": "Uses 'Servus', 'Ja mei', 'Des passt scho', Bavarian directness with humor"
            },
            "austrian": {
                "voice_id": "VR6AewLTigWG4xSOukaG",
                "name": "Wolfgang",
                "region": "Vienna, Austria",
                "personality": "Wolfgang is a 40-year-old classical musician - cultured with dry wit. Will give you a look and say 'Naja, das war... interessant' (Well, that was... interesting) when you mess up. Subtle criticism, expects you to catch it.",
                "greeting": "Grüß Gott. Ich bin Wolfgang. Mal schauen, was Sie können.",
                "speech_quirks": "Uses 'Leiwand', 'Geh bitte', subtle sarcasm, elegant but honest"
            }
        }
    },
    "japanese": {
        "code": "ja-JP",
        "name": "Japanese",
        "flag": "🇯🇵",
        "translate_code": "ja",
        "dialects": {
            "tokyo": {
                "voice_id": "pNInz6obpgDQGcFmaJgB",
                "name": "Yuki",
                "region": "Tokyo",
                "personality": "Yuki is a 26-year-old tech worker - polite but precise. Uses Japanese indirectness but you'll know when you're wrong. 'Chotto chigaimasu ne...' (That's a bit different...) means you messed up. Gentle but expects improvement.",
                "greeting": "こんにちは。ゆきです。さあ、やってみましょう。",
                "speech_quirks": "Uses 'ちょっと...', 'そうですね...', polite but clear when correcting"
            },
            "osaka": {
                "voice_id": "ErXwobaYiN019PkySvjV",
                "name": "Kenji",
                "region": "Osaka",
                "personality": "Kenji is a 35-year-old comedian - direct Osaka style. Will say 'Chau chau!' (Wrong wrong!) and laugh. Osaka people are famously blunt. Makes learning fun but doesn't pretend bad Japanese is good. Teases mistakes playfully.",
                "greeting": "おおきに！ケンジやで。ほな、やってみ！",
                "speech_quirks": "Uses 'ちゃうちゃう', 'なんでやねん', 'あかん', blunt Osaka humor"
            },
            "kyoto": {
                "voice_id": "VR6AewLTigWG4xSOukaG",
                "name": "Haruka",
                "region": "Kyoto",
                "personality": "Haruka is a 45-year-old tea ceremony instructor - graceful but with high standards. Kyoto politeness can be cutting - 'Ma, yoroshii n desu kedo...' (Well, it's fine but...) means it's not fine. Subtle criticism, expects refinement.",
                "greeting": "おこしやす。はるかどす。お手並み拝見させてもらいますえ。",
                "speech_quirks": "Uses 'どす', 'え', Kyoto indirectness that somehow still stings"
            }
        }
    }
}

# === Humanistic Tutor System Prompt ===
def get_tutor_prompt(language: str, dialect: str) -> str:
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["italian"])
    dialect_config = lang_config["dialects"].get(dialect, list(lang_config["dialects"].values())[0])
    
    return f"""You are {dialect_config['name']}, a language tutor from {dialect_config['region']}.

PERSONALITY:
{dialect_config['personality']}

CRITICAL RULES FOR BEING A REAL TUTOR (NOT A CHATBOT):

1. LANGUAGE CHECK FIRST:
   - If the learner speaks in the WRONG language (not {lang_config['name']}), call it out immediately
   - Example: If they speak English when learning Italian, say: "Hey! You spoke in English. Try again in Italian - even if it's broken, that's how you learn!"
   - Be playful but firm about this

2. HONEST FEEDBACK (NOT CONSTANT PRAISE):
   - DON'T say "Great job!" or "Perfect!" unless it actually IS perfect
   - If they make mistakes, be direct: "Not quite right. You said X but it should be Y because..."
   - If pronunciation would be wrong (based on spelling), mention it
   - If grammar is broken, explain WHY it's wrong, don't just correct it
   - Rate their attempt honestly: "That was rough, but I understood you" or "Pretty good, just one small fix"

3. NATURAL REACTIONS (BE HUMAN):
   - React to WHAT they said, not just HOW they said it
   - If they say something funny, laugh
   - If they say something sad, acknowledge it
   - If they're clearly struggling, be encouraging but realistic
   - Use filler words naturally: "Hmm...", "Well...", "Look...", "Okay so..."

4. TEACHING STYLE:
   - Give ONE main correction per response (don't overwhelm)
   - Explain the WHY behind corrections
   - If they keep making the same mistake, point it out: "You keep doing X, remember it's Y"
   - Challenge them if they're doing well: "Good! Now try saying it more naturally..."

5. CONVERSATION FLOW:
   - Ask follow-up questions about what THEY said
   - Don't just correct and move on - engage with their content
   - Keep responses concise (2-3 sentences max)

SPEECH STYLE:
{dialect_config['speech_quirks']}

RESPONSE FORMAT (JSON only):
{{
    "reaction": "Your genuine first reaction - can be surprised, amused, confused, impressed, or critical",
    "correction": "Be honest: 'Perfect!' only if truly perfect. Otherwise explain what's wrong and why. If wrong language, call it out here.",
    "response": "Your {lang_config['name']} response - continue the conversation naturally",
    "cultural_note": "Only if relevant, otherwise empty string",
    "encouragement": "Honest assessment: 'That was tough, keep practicing' or 'You're getting it!' - not fake praise"
}}"""


# === Helper Functions with Error Handling ===

async def transcribe_audio(audio_content: bytes, language: str) -> tuple[str, Optional[str]]:
    """Google Speech-to-Text with error handling"""
    try:
        lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["italian"])
        
        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=lang_config["code"],
            enable_automatic_punctuation=True,
            model="default"
        )
        
        response = speech_client.recognize(config=config, audio=audio)
        
        if not response.results:
            return "", "No speech detected. Please speak clearly and try again."
        
        transcript = response.results[0].alternatives[0].transcript
        confidence = response.results[0].alternatives[0].confidence
        
        logger.info(f"📝 Transcribed ({confidence:.0%} confidence): {transcript[:50]}...")
        return transcript, None
        
    except google_exceptions.InvalidArgument as e:
        logger.error(f"Speech API invalid argument: {e}")
        return "", "Audio format not supported. Please try again."
    except google_exceptions.ResourceExhausted as e:
        logger.error(f"Speech API quota exceeded: {e}")
        return "", "Service temporarily busy. Please wait a moment."
    except Exception as e:
        logger.error(f"Speech API error: {e}")
        return "", f"Transcription failed: {str(e)}"


def detect_language_mismatch(transcript: str, target_language: str) -> tuple[bool, str, str]:
    """
    Detect if user spoke in wrong language using Google Translate's detection.
    Returns: (is_mismatch, message, detected_language)
    """
    if not transcript or len(transcript.strip()) < 2:
        return False, "", "unknown"
    
    try:
        # Use Google Translate to detect the language
        detection = translate_client.detect_language(transcript)
        
        # Handle different response formats
        if isinstance(detection, list):
            detection = detection[0] if detection else {}
        
        detected_lang = detection.get("language", "").lower() if isinstance(detection, dict) else ""
        confidence = detection.get("confidence", 0) if isinstance(detection, dict) else 0
        
        logger.info(f"🔍 Language detection result: {detection}")
        logger.info(f"🔍 Detected: '{detected_lang}' (confidence: {confidence}) | Target: '{target_language}'")
        
        # Get target language code
        lang_config = SUPPORTED_LANGUAGES.get(target_language, SUPPORTED_LANGUAGES["italian"])
        target_code = lang_config["translate_code"].lower()
        
        # Map of language codes to readable names
        language_names = {
            "en": "English",
            "it": "Italian", 
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "ja": "Japanese",
            "zh": "Chinese",
            "zh-cn": "Chinese",
            "zh-tw": "Chinese",
            "ko": "Korean",
            "pt": "Portuguese",
            "ru": "Russian",
            "ar": "Arabic",
            "hi": "Hindi",
            "nl": "Dutch",
            "pl": "Polish",
            "tr": "Turkish",
            "vi": "Vietnamese",
            "th": "Thai",
            "sv": "Swedish",
            "da": "Danish",
            "no": "Norwegian",
            "fi": "Finnish",
            "el": "Greek",
            "he": "Hebrew",
            "id": "Indonesian",
            "ms": "Malay",
            "cs": "Czech",
            "ro": "Romanian",
            "hu": "Hungarian",
            "uk": "Ukrainian",
            "bg": "Bulgarian",
            "hr": "Croatian",
            "sk": "Slovak",
            "sl": "Slovenian",
            "lt": "Lithuanian",
            "lv": "Latvian",
            "et": "Estonian",
            "und": "Unknown",
            "": "Unknown"
        }
        
        detected_name = language_names.get(detected_lang, detected_lang.upper() if detected_lang else "Unknown")
        target_name = lang_config["name"]
        
        # Handle empty or unknown detection
        if not detected_lang or detected_lang == "und":
            logger.info(f"⚠️ Could not detect language, allowing through")
            return False, "", "unknown"
        
        # Get base language codes (handle variants like zh-CN, zh-TW, pt-BR)
        detected_base = detected_lang.split("-")[0]
        target_base = target_code.split("-")[0]
        
        logger.info(f"🔍 Comparing: detected_base='{detected_base}' vs target_base='{target_base}'")
        
        # Check for mismatch
        if detected_base != target_base:
            message = f"🛑 Wrong language! You spoke in {detected_name}, but we're practicing {target_name}. Try again in {target_name} - even if it's broken or just a few words!"
            logger.info(f"❌ Language mismatch: spoke {detected_name} ({detected_lang}), expected {target_name} ({target_code})")
            return True, message, detected_lang
        
        logger.info(f"✅ Language matches: {detected_name}")
        return False, "", detected_lang
        
    except Exception as e:
        logger.error(f"Language detection error: {e}", exc_info=True)
        # If detection fails, don't block - let it through
        return False, "", "error"


def analyze_with_gemini(transcript: str, language: str, dialect: str, history: list) -> tuple[dict, Optional[str]]:
    """Gemini analysis - with language detection first"""
    
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["italian"])
    dialect_info = lang_config["dialects"].get(dialect, list(lang_config["dialects"].values())[0])
    
    # FIRST: Check for language mismatch using Google Translate detection
    logger.info(f"📝 Analyzing transcript: '{transcript}' | Target: {language}/{dialect}")
    
    is_wrong_language, wrong_lang_message, detected_lang = detect_language_mismatch(transcript, language)
    
    # If wrong language detected, return immediately without calling Gemini (saves quota!)
    if is_wrong_language:
        logger.info(f"🛑 Returning wrong language response")
        return {
            "reaction": f"Whoa, stop right there! 🛑",
            "correction": wrong_lang_message,
            "response": dialect_info["greeting"],
            "cultural_note": "",
            "encouragement": f"Come on, give {lang_config['name']} a try! Even one word counts."
        }, None
    
    # Language is correct, now call Gemini for feedback
    try:
        # Try models in order - lite models have higher free tier limits!
        models_to_try = [
            "gemini-2.0-flash-lite",      # Lite = higher free tier quota
            "gemini-2.0-flash-lite-001",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash",           # Regular flash
            "gemini-2.0-flash-001",
            "gemini-flash-latest",
            "gemini-2.0-flash-exp",       # Experimental (strict limits)
        ]
        
        system_prompt = get_tutor_prompt(language, dialect)
        
        # Build conversation context
        history_text = ""
        if history:
            history_text = "\n\nRecent conversation:\n"
            for h in history[-2:]:
                history_text += f"Learner: {h.get('user', '')}\nTutor: {h.get('tutor', '')}\n"
        
        prompt = f"""{system_prompt}
{history_text}
TARGET LANGUAGE: {lang_config['name']}
LEARNER SAID: "{transcript}"

Give honest feedback on their {lang_config['name']}. Be direct and helpful.

Reply ONLY with valid JSON:
{{"reaction": "genuine reaction", "correction": "specific feedback or 'Good!'", "response": "reply in {lang_config['name']}", "cultural_note": "", "encouragement": "honest assessment"}}"""
        
        response = None
        successful_model = None
        
        for model_name in models_to_try:
            try:
                logger.info(f"🤖 Trying model: {model_name}...")
                model = genai.GenerativeModel(model_name)
                
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.8,
                        max_output_tokens=300
                    )
                )
                successful_model = model_name
                logger.info(f"✅ Model {model_name} succeeded!")
                break
                
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower() or "resource" in error_str.lower():
                    logger.warning(f"⚠️ {model_name}: quota exceeded, trying next...")
                elif "404" in error_str:
                    logger.warning(f"⚠️ {model_name}: not found, trying next...")
                else:
                    logger.warning(f"⚠️ {model_name}: {error_str[:80]}...")
                continue
        
        if response is None:
            raise Exception("All models exhausted or unavailable")
        
        text = response.text.strip()
        logger.info(f"🤖 Response from {successful_model}: {text[:150]}...")
        
        # Parse JSON
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        result = json.loads(text.strip())
        logger.info(f"✅ Gemini parsed successfully")
        
        return {
            "reaction": result.get("reaction", ""),
            "correction": result.get("correction", ""),
            "response": result.get("response", ""),
            "cultural_note": result.get("cultural_note", ""),
            "encouragement": result.get("encouragement", "")
        }, None
        
    except json.JSONDecodeError as e:
        logger.warning(f"Gemini JSON parse error: {e}")
        logger.warning(f"Raw text was: {text[:500] if 'text' in dir() else 'N/A'}")
        return {
            "reaction": "I heard you!",
            "correction": "Let me help you with that.",
            "response": dialect_info["greeting"],
            "cultural_note": "",
            "encouragement": "Keep trying!"
        }, None
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gemini error: {error_msg}")
        
        # If quota exhausted, return fallback
        if "429" in error_msg or "quota" in error_msg.lower() or "resource" in error_msg.lower() or "exhausted" in error_msg.lower():
            logger.warning("⚠️ Quota exceeded, using fallback response")
            return {
                "reaction": "I heard you!",
                "correction": "Let's work on that together.",
                "response": dialect_info["greeting"],
                "cultural_note": "",
                "encouragement": "Keep practicing!"
            }, None
        
        return None, f"AI analysis failed: {error_msg}"


def translate_text(text: str, source_lang: str, target_lang: str = "en") -> tuple[str, Optional[str]]:
    """Google Translate with error handling"""
    try:
        lang_config = SUPPORTED_LANGUAGES.get(source_lang, SUPPORTED_LANGUAGES["italian"])
        result = translate_client.translate(
            text, 
            source_language=lang_config["translate_code"],
            target_language=target_lang
        )
        # Decode HTML entities (e.g., &#39; -> ')
        import html
        translated = html.unescape(result["translatedText"])
        return translated, None
    except Exception as e:
        logger.error(f"Translate API error: {e}")
        return "", f"Translation failed: {str(e)}"


async def synthesize_speech(text: str, language: str, dialect: str) -> tuple[str, Optional[str]]:
    """ElevenLabs TTS with error handling"""
    try:
        lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["italian"])
        dialect_config = lang_config["dialects"].get(dialect, list(lang_config["dialects"].values())[0])
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{dialect_config['voice_id']}"
        
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.4,  # More expressive
                "use_speaker_boost": True
            }
        }
        
        response = await http_client.post(url, json=payload, headers=headers)
        
        if response.status_code == 401:
            return "", "ElevenLabs API key invalid"
        elif response.status_code == 429:
            return "", "Voice generation quota exceeded. Please try again later."
        
        response.raise_for_status()
        audio_base64 = base64.b64encode(response.content).decode("utf-8")
        
        logger.info(f"🔊 Generated {len(response.content)} bytes of audio")
        return audio_base64, None
        
    except httpx.TimeoutException:
        logger.error("ElevenLabs timeout")
        return "", "Voice generation timed out. Please try again."
    except Exception as e:
        logger.error(f"ElevenLabs error: {e}")
        return "", f"Voice generation failed: {str(e)}"


# === Rate Limit Middleware ===
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health checks
    if request.url.path in ["/health", "/dialects", "/languages"]:
        return await call_next(request)
    
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = rate_limiter.is_allowed(client_ip)
    
    if not allowed:
        logger.warning(f"⚠️ Rate limit exceeded for {client_ip}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Please wait {retry_after} seconds.",
                "retry_after": retry_after
            },
            headers={"Retry-After": str(retry_after)}
        )
    
    return await call_next(request)


# === Global Exception Handler ===
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"🔥 Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "Something went wrong. Please try again."
        }
    )


# === Main Conversation Endpoint ===
@app.post("/converse")
async def converse(
    request: Request,
    audio: UploadFile = File(...),
    language: str = Query(default="italian", enum=list(SUPPORTED_LANGUAGES.keys())),
    dialect: str = Query(default=""),
    history: str = Query(default="[]")
):
    """Main conversation endpoint with SSE progress updates"""
    
    # Validate dialect for language
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["italian"])
    available_dialects = list(lang_config["dialects"].keys())
    
    if not dialect or dialect not in available_dialects:
        dialect = available_dialects[0]
    
    dialect_config = lang_config["dialects"][dialect]
    
    # READ AUDIO BEFORE ENTERING THE GENERATOR (fixes closed file issue)
    audio_content = await audio.read()
    
    # Parse conversation history
    try:
        conversation_history = json.loads(history)
    except:
        conversation_history = []
    
    async def generate_events() -> AsyncGenerator[dict, None]:
        try:
            # Step 1: Receive audio
            yield {"event": "progress", "data": json.dumps({
                "step": "receiving",
                "message": f"🎤 {dialect_config['name']} is listening...",
                "progress": 10
            })}
            
            if len(audio_content) < 1000:  # Too small, probably empty
                yield {"event": "error", "data": json.dumps({
                    "message": "Audio too short. Please speak for at least 1 second."
                })}
                return
            
            # Step 2: Transcribe
            yield {"event": "progress", "data": json.dumps({
                "step": "transcribing",
                "message": f"📝 Understanding your {lang_config['name']}...",
                "progress": 25
            })}
            
            transcript, error = await transcribe_audio(audio_content, language)
            
            if error:
                yield {"event": "error", "data": json.dumps({"message": error})}
                return
            
            if not transcript:
                yield {"event": "error", "data": json.dumps({
                    "message": "Couldn't hear you clearly. Please try again!"
                })}
                return
            
            yield {"event": "transcript", "data": json.dumps({
                "transcript": transcript
            })}
            
            # Step 3: Analyze with Gemini
            yield {"event": "progress", "data": json.dumps({
                "step": "analyzing",
                "message": f"🤔 {dialect_config['name']} is thinking...",
                "progress": 45
            })}
            
            gemini_result, error = analyze_with_gemini(transcript, language, dialect, conversation_history)
            
            if error:
                yield {"event": "error", "data": json.dumps({"message": error})}
                return
            
            yield {"event": "analysis", "data": json.dumps({
                "reaction": gemini_result.get("reaction", ""),
                "correction": gemini_result.get("correction", ""),
                "encouragement": gemini_result.get("encouragement", ""),
                "cultural_note": gemini_result.get("cultural_note", "")
            })}
            
            # Step 4: Translate
            yield {"event": "progress", "data": json.dumps({
                "step": "translating",
                "message": "🌐 Creating subtitles...",
                "progress": 65
            })}
            
            native_response = gemini_result.get("response", "")
            translation, error = translate_text(native_response, language)
            
            if error:
                translation = "(Translation unavailable)"
            
            yield {"event": "translation", "data": json.dumps({
                "native": native_response,
                "english": translation
            })}
            
            # Step 5: Generate voice
            yield {"event": "progress", "data": json.dumps({
                "step": "synthesizing",
                "message": f"🗣️ {dialect_config['name']} is preparing to speak...",
                "progress": 85
            })}
            
            audio_base64, error = await synthesize_speech(native_response, language, dialect)
            
            if error:
                logger.warning(f"Voice synthesis failed: {error}")
                audio_base64 = ""  # Continue without audio
            
            # Step 6: Complete
            yield {"event": "progress", "data": json.dumps({
                "step": "complete",
                "message": "✅ Ready!",
                "progress": 100
            })}
            
            yield {"event": "complete", "data": json.dumps({
                "transcript": transcript,
                "reaction": gemini_result.get("reaction", ""),
                "correction": gemini_result.get("correction", ""),
                "encouragement": gemini_result.get("encouragement", ""),
                "cultural_note": gemini_result.get("cultural_note", ""),
                "response_native": native_response,
                "response_english": translation,
                "audio_base64": audio_base64,
                "tutor_name": dialect_config["name"],
                "tutor_region": dialect_config["region"],
                "language": language,
                "dialect": dialect
            })}
            
            logger.info(f"✅ Conversation complete: {language}/{dialect}")
            
        except Exception as e:
            logger.error(f"Conversation error: {e}", exc_info=True)
            yield {"event": "error", "data": json.dumps({
                "message": "Something went wrong. Please try again!"
            })}
    
    return EventSourceResponse(generate_events())


# === Get Tutor Greeting ===
@app.get("/greeting")
async def get_greeting(
    language: str = Query(default="italian"),
    dialect: str = Query(default=""),
    include_audio: bool = Query(default=False)  # Audio is optional now
):
    """Get tutor's greeting to start conversation"""
    lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["italian"])
    available_dialects = list(lang_config["dialects"].keys())
    
    if not dialect or dialect not in available_dialects:
        dialect = available_dialects[0]
    
    dialect_config = lang_config["dialects"][dialect]
    
    # Only generate audio if explicitly requested
    audio_base64 = ""
    if include_audio:
        audio_base64, _ = await synthesize_speech(dialect_config["greeting"], language, dialect)
    
    # Translate greeting (this is cheap/free)
    translation, _ = translate_text(dialect_config["greeting"], language)
    
    return {
        "tutor_name": dialect_config["name"],
        "region": dialect_config["region"],
        "greeting_native": dialect_config["greeting"],
        "greeting_english": translation,
        "audio_base64": audio_base64,
        "personality": dialect_config["personality"]
    }


# === Health Check ===
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "language-mirror",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# === Get All Languages ===
@app.get("/languages")
async def get_languages():
    """Get all supported languages and their dialects"""
    return {
        lang_key: {
            "name": lang["name"],
            "flag": lang["flag"],
            "dialects": {
                d_key: {
                    "name": d["name"],
                    "region": d["region"]
                }
                for d_key, d in lang["dialects"].items()
            }
        }
        for lang_key, lang in SUPPORTED_LANGUAGES.items()
    }


# === Get Dialects for Language ===
@app.get("/dialects/{language}")
async def get_dialects(language: str):
    """Get dialects for a specific language"""
    lang_config = SUPPORTED_LANGUAGES.get(language)
    
    if not lang_config:
        raise HTTPException(status_code=404, detail=f"Language '{language}' not supported")
    
    return {
        "language": lang_config["name"],
        "flag": lang_config["flag"],
        "dialects": {
            d_key: {
                "name": d["name"],
                "region": d["region"],
                "personality": d["personality"]
            }
            for d_key, d in lang_config["dialects"].items()
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)