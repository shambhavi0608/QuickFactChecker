from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
# import joblib  # Uncomment if you have the model file

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

# ------------------------------
# Load the model
# Comment out if model_pipeline.pkl is missing
# model_path = 'model\\model_pipeline.pkl'
# model = joblib.load(model_path)
# ------------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data
        data = request.get_json(force=True)
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing or incorrect key "text" in JSON data'}), 400

        text = data['text']

        # Handle empty or invalid input
        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': '⚠️ Please enter some text before submitting.'}), 400

        # ------------------------------
        # Uncomment this once model is available
        # prediction = model.predict([text])[0]
        # prediction = int(prediction)
        # return jsonify({'prediction': prediction})
        # ------------------------------

        # Temporary placeholder since model is not loaded
        return jsonify({'message': 'Text received successfully!'})

    except Exception as e:
        print(f"Error in /predict: {e}")  # Log the error for debugging
        return jsonify({'error': 'Internal server error.'}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)