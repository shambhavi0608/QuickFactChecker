import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, f1_score, confusion_matrix
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

# Convert text into TF-IDF features
vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
X_vec = vectorizer.fit_transform(X)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X_vec, y, test_size=0.2, random_state=42
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

    except Exception as e:
        print(f"⚠️ Error training {name}: {type(e).__name__}: {e}")
        results[name] = {"accuracy": 0.0, "precision": 0.0, "f1": 0.0}

# -------------------------
# Train models
# -------------------------
results = {}

train_and_evaluate(MultinomialNB(), "Naive Bayes", results)
train_and_evaluate(LogisticRegression(max_iter=1000), "Logistic Regression", results)
train_and_evaluate(RandomForestClassifier(n_estimators=100, random_state=42), "Random Forest", results)

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
try:
    models = list(results.keys())
    accuracies = [results[m]["accuracy"] for m in models]

    plt.figure(figsize=(8, 5))
    plt.bar(models, accuracies, color=['skyblue', 'lightgreen', 'salmon'])
    plt.ylim(0, 0.5)
    plt.xlabel("Models")
    plt.ylabel("Accuracy")
    plt.title("Model Accuracy Comparison")

    for i, acc in enumerate(accuracies):
        plt.text(i, acc + 0.01, f"{acc:.2f}", ha='center', fontsize=12)

    plt.savefig(RESULTS_DIR / "comparison.png")
    plt.show()
except Exception as e:
    print(f"⚠️ Error generating plot: {type(e).__name__}: {e}")