from flask import Flask, request, jsonify, render_template
import joblib
from flask_cors import CORS



app = Flask(__name__)
CORS(app)  # Enable CORS for all domains



# Load the model
model_path = 'model\\model_pipeline.pkl'
model = joblib.load(model_path)



@app.route('/')
def index():
    return render_template('index.html')



@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        if 'text' not in data:
            return jsonify({'error': 'Missing or incorrect key "text" in JSON data'})
        
        text = data['text']
        prediction = model.predict([text])[0]
        
        # Convert numpy.int64 to int for JSON serialization
        prediction = int(prediction)
        
        return jsonify({'prediction': prediction})
    
    except Exception as e:
        return jsonify({'error': str(e)})





if __name__ == '__main__':
    app.run(debug=True)
