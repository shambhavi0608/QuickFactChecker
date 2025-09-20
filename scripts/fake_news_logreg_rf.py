import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score
import matplotlib.pyplot as plt
import os

# -------------------------
# Load and preprocess dataset
# -------------------------
df = pd.read_csv("QuickFactChecker/dataset/liar/train.tsv", sep="\t", on_bad_lines="warn")

df.columns = [
    "id", "label", "statement", "subject", "speaker", "job", "state", "party",
    "barely_true_counts", "false_counts", "half_true_counts", "mostly_true_counts",
    "pants_on_fire_counts", "context"
]

X = df["statement"]   # claim text
y = df["label"]       # truth label (categories)

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
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
    results[name] = {"accuracy": acc, "precision": prec}

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
print("{:<20} {:<10} {:<10}".format("Model", "Accuracy", "Precision"))
for model, scores in results.items():
    print("{:<20} {:.4f}    {:.4f}".format(model, scores["accuracy"], scores["precision"]))

# -------------------------
# Save results to markdown
# -------------------------
os.makedirs("results", exist_ok=True)

with open("results/model_comparison.md", "w") as f:
    f.write("# Model Comparison Results\n\n")
    f.write("| Model              | Accuracy | Precision |\n")
    f.write("|--------------------|----------|-----------|\n")
    for model, scores in results.items():
        f.write(f"| {model} | {scores['accuracy']:.4f} | {scores['precision']:.4f} |\n")

# -------------------------
# Plot comparison
# -------------------------
models = list(results.keys())
accuracies = [results[m]["accuracy"] for m in models]

plt.figure(figsize=(8,5))
plt.bar(models, accuracies, color=['skyblue', 'lightgreen', 'salmon'])
plt.ylim(0,0.5)
plt.xlabel("Models")
plt.ylabel("Accuracy")
plt.title("Model Accuracy Comparison")

# Add accuracy labels
for i, acc in enumerate(accuracies):
    plt.text(i, acc + 0.01, f"{acc:.2f}", ha='center', fontsize=12)

plt.savefig("results/comparison.png")
plt.show()
