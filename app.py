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
        if 'text' not in data:
            return jsonify({'error': 'Missing or incorrect key "text" in JSON data'})

        text = data['text']

        # ✅ Beginner-friendly fix: handle empty input
        if not text.strip():
            return jsonify({'error': '⚠️ Please enter some text before submitting.'})

        # ------------------------------
        # Uncomment this once model is available
        # prediction = model.predict([text])[0]
        # prediction = int(prediction)
        # return jsonify({'prediction': prediction})
        # ------------------------------

        # Temporary placeholder since model is not loaded
        return jsonify({'message': 'Text received successfully!'})

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
