REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Security Simulation Report</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            background-color: #ffffff;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0ea5e9;
        }
        h1 { font-size: 24px; margin: 10px 0; }
        .subtitle { color: #64748b; font-size: 14px; }
        
        .section { margin-bottom: 30px; }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0ea5e9;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .summary-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .summary-item {
            display: table-cell;
            width: 25%;
            padding: 15px;
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            text-align: center;
        }
        .summary-item:last-child { border-right: none; }
        .metric-value { font-size: 24px; font-weight: bold; color: #0ea5e9; }
        .metric-label { font-size: 12px; color: #64748b; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #f1f5f9;
            text-align: left;
            padding: 10px;
            font-size: 12px;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
        }
        
        .badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        .badge-critical { background: #fee2e2; color: #ef4444; }
        .badge-high { background: #ffedd5; color: #f59e0b; }
        .badge-medium { background: #f3e8ff; color: #8b5cf6; }
        .badge-low { background: #dcfce7; color: #22c55e; }
        
        .remedy-item {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 12px;
            margin-bottom: 10px;
        }
        .remedy-title { font-weight: bold; font-size: 14px; margin-bottom: 4px; display: block; }
        .remedy-desc { font-size: 12px; color: #475569; }
        
        .footer {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🛡️ AttackSimulator AlphaCore</div>
        <h1>Executive Security Assessment Report</h1>
        <div class="subtitle">Comprehensive analysis of organizational security awareness and risk posture</div>
        <div class="subtitle">Generated on: {{ date }}</div>
    </div>

    <div class="section">
        <div class="section-title">1. Executive Summary</div>
        <p style="font-size: 12px;">This report provides an in-depth analysis of recent security simulations conducted across the organization. It highlights critical vulnerabilities, departmental risk concentrations, and actionable recommendations to strengthen the defensive perimeter against social engineering attacks.</p>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="metric-value">{{ click_rate }}%</div>
                <div class="metric-label">Phishing Click Rate</div>
            </div>
            <div class="summary-item">
                <div class="metric-value">{{ credential_rate }}%</div>
                <div class="metric-label">Credential Submission</div>
            </div>
            <div class="summary-item">
                <div class="metric-value">{{ download_rate }}%</div>
                <div class="metric-label">Malware Download</div>
            </div>
            <div class="summary-item">
                <div class="metric-value">{{ report_rate }}%</div>
                <div class="metric-label">Reporting Rate</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Risk Distribution Analysis</div>
        <div style="font-size: 12px; margin-bottom: 10px;">Organizational breakdown by employee risk levels:</div>
        <table style="width: 50%;">
            <thead>
                <tr>
                    <th>Risk Level</th>
                    <th>Count</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                {% for entry in distribution %}
                <tr>
                    <td><span class="badge badge-{{ entry.level.lower() }}">{{ entry.level }}</span></td>
                    <td>{{ entry.count }}</td>
                    <td>{{ entry.percentage }}%</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">3. Departmental Risk Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Simulations</th>
                    <th>Click Rate</th>
                    <th>Credentials</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {% for dept in departments %}
                <tr>
                    <td>{{ dept.name }}</td>
                    <td>{{ dept.total }}</td>
                    <td>{{ dept.click_rate }}%</td>
                    <td>{{ dept.credential_rate }}%</td>
                    <td><span class="badge badge-{{ dept.risk_level.lower() }}">{{ dept.risk_level }}</span></td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">4. Top Vulnerable Employees</div>
        <div style="font-size: 11px; margin-bottom: 10px; color: #ef4444;">High-priority targets for immediate security awareness training:</div>
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Clicks</th>
                    <th>Creds</th>
                    <th>Score</th>
                    <th>Risk</th>
                </tr>
            </thead>
            <tbody>
                {% for u in top_users %}
                <tr>
                    <td>{{ u.email }}</td>
                    <td>{{ u.department }}</td>
                    <td>{{ u.clicks }}</td>
                    <td>{{ u.credentials }}</td>
                    <td>{{ u.risk_score }}</td>
                    <td><span class="badge badge-{{ u.risk_level.value.lower() }}">{{ u.risk_level.value }}</span></td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">5. Multi-Channel Performance</div>
        <table>
            <thead>
                <tr>
                    <th>Channel</th>
                    <th>Sent</th>
                    <th>Clicks</th>
                    <th>Rate</th>
                </tr>
            </thead>
            <tbody>
                {% for ch in channels %}
                <tr>
                    <td>{{ ch.type }}</td>
                    <td>{{ ch.sent }}</td>
                    <td>{{ ch.clicks }}</td>
                    <td>{{ ch.rate }}%</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">6. Key AI Insights</div>
        <ul style="font-size: 12px;">
            {% for insight in insights %}
            <li>{{ insight }}</li>
            {% endfor %}
        </ul>
    </div>

    <div class="section">
        <div class="section-title">7. Remediation Strategy & Next Steps</div>
        {% for remedy in remedies %}
        <div class="remedy-item">
            <span class="remedy-title">{{ remedy.title }}</span>
            <span class="remedy-desc">{{ remedy.description }}</span>
        </div>
        {% endfor %}
    </div>

    <div class="footer">
        Confidential Document — Strictly for internal institutional review only.<br>
        AttackSimulator AlphaCore Platform Support: support@attacksim.com
    </div>
</body>
</html>
"""
