from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from werkzeug.utils import secure_filename
import os
import joblib
import logging
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
MODEL_PATH = 'model/BasedModel.pkl'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024


os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_model():
    try:
        if not os.path.exists(MODEL_PATH):
            logger.error(f"Model file not found at {MODEL_PATH}")
            return None
        model = joblib.load(MODEL_PATH)
        return model
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        logger.error(traceback.format_exc())
        return None


model = load_model()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': model is not None
    })

@app.route('/api/predict', methods=['POST'])
def predict_defects():
    try:
        
        logger.info("Received prediction request")
        
        
        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            logger.error("No selected file")
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({'error': 'Invalid file type. Only CSV files are allowed'}), 400

        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        logger.info(f"File saved temporarily at {filepath}")

        logger.info("Reading CSV file")
        df = pd.read_csv(filepath)
        logger.info(f"CSV loaded with shape: {df.shape}")
        
        
        logger.info(f"DataFrame columns: {df.columns.tolist()}")

        
        if model is None:
            logger.error("Model not loaded")
            return jsonify({'error': 'Model not available'}), 500

        
        logger.info("Generating mock predictions for testing")
        mock_predictions = np.random.choice(['Pastry', 'Z_Scratch', 'K_Scatch', 'Stains', 'Dirtiness'], size=len(df))
        mock_probabilities = np.random.rand(len(df), 5)
        mock_probabilities = mock_probabilities / mock_probabilities.sum(axis=1)[:, np.newaxis]

    
        predictions = mock_predictions
        probabilities = mock_probabilities

        
        results = []
        for idx, (pred, prob) in enumerate(zip(predictions, probabilities)):
            max_prob = np.max(prob)
            result = {
                'id': f'SP{str(idx + 10).zfill(3)}',
                'defectClass': pred,
                'confidence': float(max_prob)
            }
            results.append(result)

        
        total_plates = len(results)
        defect_count = sum(1 for r in results if r['defectClass'] != 'No_Defect')
        defect_rate = (defect_count / total_plates) * 100 if total_plates > 0 else 0
        quality_score = 100 - defect_rate

        
        defect_types = {}
        for result in results:
            defect_class = result['defectClass']
            defect_types[defect_class] = defect_types.get(defect_class, 0) + 1

        
        weekly_trends = [
            {"day": "Mon", "defects": 12},
            {"day": "Tue", "defects": 19},
            {"day": "Wed", "defects": 15},
            {"day": "Thu", "defects": 22},
            {"day": "Fri", "defects": 18},
            {"day": "Sat", "defects": 14},
            {"day": "Sun", "defects": 10}
        ]

        
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Cleaned up temporary file: {filepath}")

        response_data = {
            'status': 'success',
            'predictions': results,
            'statistics': {
                'totalPlates': total_plates,
                'defectRate': round(defect_rate, 1),
                'qualityScore': round(quality_score, 1)
            },
            'defectDistribution': [
                {'name': k, 'value': v} for k, v in defect_types.items()
            ],
            'weeklyTrends': weekly_trends
        }

        logger.info("Successfully processed prediction request")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'details': traceback.format_exc()
        }), 500

    finally:
        
        if 'filepath' in locals() and os.path.exists(filepath):
            try:
                os.remove(filepath)
                logger.info(f"Cleaned up temporary file in finally block: {filepath}")
            except Exception as e:
                logger.error(f"Error cleaning up file: {str(e)}")

if __name__ == '__main__':
    logger.info("Starting Flask application")
    logger.info(f"Upload folder: {UPLOAD_FOLDER}")
    logger.info(f"Model path: {MODEL_PATH}")
    app.run(debug=True, port=5000)