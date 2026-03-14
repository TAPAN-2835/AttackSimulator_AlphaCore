import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def train_risk_model():
    """
    Trains a simple Random Forest model to predict phishing risk.
    Features: [clicks, credential_attempts, downloads, reported, past_behavior_score]
    Target: [0, 1] (0: Low Risk, 1: High Risk)
    """
    # Sample training data (Synthetic for MVP demo)
    # [clicks, credentials, downloads, reported, department_code]
    # Departments: 0: IT, 1: HR, 2: Finance, 3: Marketing
    X = np.array([
        [0, 0, 0, 1, 0], [0, 0, 0, 0, 1], [1, 0, 0, 0, 2], [1, 1, 0, 0, 3],
        [5, 2, 1, 0, 0], [10, 5, 2, 0, 1], [0, 0, 0, 1, 2], [1, 0, 0, 1, 3],
        [2, 1, 0, 0, 0], [8, 4, 3, 0, 1], [0, 0, 0, 2, 2], [0, 0, 0, 1, 3]
    ])
    y = np.array([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0])

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    joblib.dump(model, "risk_model.pkl")
    print("Risk model trained and saved as risk_model.pkl")

if __name__ == "__main__":
    train_risk_model()
