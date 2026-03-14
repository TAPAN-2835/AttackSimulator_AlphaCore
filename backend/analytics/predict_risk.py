import joblib
import numpy as np
import os

MODEL_PATH = "risk_model.pkl"

def predict_employee_risk(clicks, credentials, downloads, reported, department):
    """
    Predicts the risk score for an employee based on their behavior.
    """
    if not os.path.exists(MODEL_PATH):
        # Return a fallback score if model is not trained
        return (clicks * 20 + credentials * 40 + downloads * 30 - reported * 15) / 100.0

    model = joblib.load(MODEL_PATH)
    
    # Map department to numeric
    dept_map = {"it": 0, "hr": 1, "finance": 2, "marketing": 3}
    dept_code = dept_map.get(department.lower(), 0)
    
    features = np.array([[clicks, credentials, downloads, reported, dept_code]])
    risk_proba = model.predict_proba(features)[0][1] # Probability of being high risk
    
    return float(risk_proba)
