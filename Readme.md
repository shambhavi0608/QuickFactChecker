# 📰 QuickFactChecker – Fake News Detection

## 📌 Project Overview
QuickFactChecker is a machine learning–based web app that helps detect whether a news article is **real** or **fake**.  
It uses different models (Naive Bayes, LSTM, etc.) trained on the **LIAR dataset** to evaluate credibility and assist users in identifying potentially misleading information.  

---

## ✨ Features
- ✅ Fake news classification using ML models (Naive Bayes, LSTM).  
- ✅ Interactive web app built with **Flask** and **HTML templates**.  
- ✅ Preprocessed dataset included (`train.tsv`, `test.tsv`, `valid.tsv`).  
- ✅ Notebooks for **data analysis & experimentation** (`liar-data-analysis.ipynb`, `dataset.ipynb`).  
- ✅ Easy setup with `requirements.txt`.  

---

## 📂 Project Structure
```bash
dataset/liar
   ├── README
   ├── train.tsv   ##Training data
   ├── test.tsv    ##Testing data
   ├── valid.tsv   ##Validation data

module/
   ├── dataset.ipynb
   ├── fake-news-detection-using-lstm.ipynb
   ├── fake-news-detection-using-nb.ipynb
   ├── liar-data-analysis.ipynb
templates/
   ├── index.html
.gitattributes
app.py
hero_img.svg
LICENSE
Readme.md
requirements.txt
```

## ⚙️ Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Deepika14145/QuickFactChecker.git
   cd QuickFactChecker
   ```
3. Create virtual environment (optional but recommended)
   ```bash
      python -m venv venv
      source venv/bin/activate   # for Linux/Mac
      venv\Scripts\activate      # for Windows
   ```

2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Run the following command to start the application:
   ```bash
   python app.py
   ```

2. The app will provide predictions on whether a news article is real or fake based on the input.
   
## 🛠️ Model Training
### Naive Bayes
Run the notebook:
 ```bash
jupyter notebook fake-news-detection-using-nb.ipynb
 ```

### LSTM
Run the notebook:
 ```bash
jupyter notebook fake-news-detection-using-lstm.ipynb
 ```

### Dataset Analysis
```bash
jupyter notebook liar-data-analysis.ipynb
 ```
## 🤝 Contributing

We welcome contributions! 🎉

- Fork the repo
- Create a new branch (git checkout -b feature-name)
- Commit your changes
- Push and open a Pull Request
  
## 📧 Contact  

For queries, feedback, or guidance regarding this project, you can contact the **mentor** assigned to the issue:  

- 📩 **GitHub**: [Deepika14145](https://github.com/Deepika14145)
- 💬 **By commit/PR comments**: Please tag the mentor in your commit or pull request discussion for direct feedback.  
 
Original Repository: [QuickFactChecker](https://github.com/Deepika14145/QuickFactChecker.git)  



## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---