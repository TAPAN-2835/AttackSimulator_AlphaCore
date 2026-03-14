from analytics.predict_risk import predict_employee_risk

def predict_risk(clicks, credentials, downloads, reported, department):
    """
    Interface requested by user as analytics/predict.py
    """
    return predict_employee_risk(clicks, credentials, downloads, reported, department)

if __name__ == "__main__":
    # Example usage
    import sys
    if len(sys.argv) == 6:
        c, cr, d, r, dept = sys.argv[1:6]
        score = predict_risk(int(c), int(cr), int(d), int(r), dept)
        print(f"Predicted Risk Score: {score}")
    else:
        print("Usage: python predict.py <clicks> <credentials> <downloads> <reported> <department>")
