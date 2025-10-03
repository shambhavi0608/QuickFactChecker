import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys
from pathlib import Path

# -------------------------
# Configurable dataset path
# -------------------------
DATASET_PATH = Path("QuickFactChecker/dataset/liar/train.tsv")
RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

# -------------------------
# Load and preprocess dataset
# -------------------------
try:
    df = pd.read_csv(DATASET_PATH, sep="\t", on_bad_lines="warn")
except FileNotFoundError:
    print(f"🛑 Dataset not found at: {DATASET_PATH}")
    sys.exit(1)
except Exception as e:
    print(f"🛑 Error loading dataset: {type(e).__name__}: {e}")
    sys.exit(1)

# ✅ Validate expected column count
expected_cols = 14
if df.shape[1] != expected_cols:
    print(f"⚠️ Unexpected column count: {df.shape[1]} (expected {expected_cols})")
    sys.exit(1)

df.columns = [
    "id", "label", "statement", "subject", "speaker", "job", "state", "party",
    "barely_true_counts", "false_counts", "half_true_counts", "mostly_true_counts",
    "pants_on_fire_counts", "context"
]

X = df["statement"]
y = df["label"]

# ✅ Encode labels (string → integers)
le = LabelEncoder()
y = le.fit_transform(y)

# Split dataset (stratified to keep class distribution)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -------------------------
# Helper function for training
# -------------------------
def train_and_evaluate(model, name, results):
    try:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        cm = confusion_matrix(y_test, y_pred)

        results[name] = {"accuracy": acc, "precision": prec, "f1": f1}

        # ✅ Save confusion matrix as image
        plt.figure(figsize=(6, 4))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title(f"{name} Confusion Matrix")
        plt.savefig(RESULTS_DIR / f"{name.lower().replace(' ', '_')}_confusion.png")
        plt.close()

        # Print classification report for detailed metrics
        print(f"\n📊 Classification Report for {name}:\n")
        print(classification_report(y_test, y_pred, target_names=le.classes_))

    except Exception as e:
        print(f"⚠️ Error training {name}: {type(e).__name__}: {e}")
        results[name] = {"accuracy": 0.0, "precision": 0.0, "f1": 0.0}

# -------------------------
# Define models with Pipelines
# -------------------------
models = {
    "Naive Bayes": Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, stop_words="english")),
        ("clf", MultinomialNB())
    ]),
    "Logistic Regression": Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, stop_words="english")),
        ("clf", LogisticRegression(max_iter=1000))
    ]),
    "Random Forest": Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, stop_words="english")),
        ("clf", RandomForestClassifier(n_estimators=100, random_state=42))
    ])
}

# -------------------------
# Train models
# -------------------------
results = {}
for name, model in models.items():
    train_and_evaluate(model, name, results)

# -------------------------
# Print results in table
# -------------------------
print("\nModel Performance Comparison:\n")
print("{:<20} {:<10} {:<10} {:<10}".format("Model", "Accuracy", "Precision", "F1-Score"))
for model, scores in results.items():
    print("{:<20} {:.4f}    {:.4f}    {:.4f}".format(model, scores["accuracy"], scores["precision"], scores["f1"]))

# -------------------------
# Save results to markdown
# -------------------------
try:
    with open(RESULTS_DIR / "model_comparison.md", "w") as f:
        f.write("# Model Comparison Results\n\n")
        f.write("| Model              | Accuracy | Precision | F1-Score |\n")
        f.write("|--------------------|----------|-----------|----------|\n")
        for model, scores in results.items():
            f.write(f"| {model} | {scores['accuracy']:.4f} | {scores['precision']:.4f} | {scores['f1']:.4f} |\n")
except Exception as e:
    print(f"⚠️ Error saving markdown file: {type(e).__name__}: {e}")

# -------------------------
# Plot comparison
# -------------------------
# new changes
try:
    models_list = list(results.keys())
    accuracies = [results[m]["accuracy"] for m in models_list]

    plt.figure(figsize=(8, 5))
    plt.bar(models_list, accuracies, color=['skyblue', 'lightgreen', 'salmon'])
    plt.ylim(0, 1.0)
    plt.xlabel("Models")
    plt.ylabel("Accuracy")
    plt.title("Model Accuracy Comparison")

    for i, acc in enumerate(accuracies):
        plt.text(i, acc + 0.01, f"{acc:.2f}", ha='center', fontsize=12)

    plt.savefig(RESULTS_DIR / "comparison.png")
    plt.show()
except Exception as e:
    print(f"⚠️ Error generating plot: {type(e).__name__}: {e}")
