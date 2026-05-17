# TimePocket
---
### Group Members
| **Student Number** | **Name** | **GitHub Username** |
| :--- | :--- | :--- |
| 24273132 | Charlee Thornett | thornch-12 |
| 23585984 | Tasveer Mann | tassiemann123 |
| 24314441 | Dylan Hu | Vylan66 |
| 24618514 | Jieh Shuen Chia (Jason) | Jason-CJS |

### Purpose
---
TimePocket is a shared scheduling web application that helps groups of friends and colleagues find common free time. Users can add their weekly availability, connect with friends, create groups, and view a heatmap of when everyone is free — making it easy to plan meetings, hangouts, and events without the back-and-forth.

### How to Launch
---
**Prerequisites**
- Python 3.12+
- pip
- Google Chrome (for Selenium tests)

**Setup**

1. Clone the repository:
```
git clone https://github.com/Vylan66/TimePocket.git
cd TimePocket
```

2. Create and activate a virtual environment:
```
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

3. Install dependencies:
```
pip install -r requirements.txt
```

4. (Optional) Create a `.env` file in the root directory for email functionality:
```
SECRET_KEY=timepocket-secret-2026
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-gmail-app-password
```
> To enable email verification for new signups, a Gmail account with an App Password is required. See [Google App Passwords](https://support.google.com/accounts/answer/185833). This step can be skipped if using demo accounts below.

5. Run database migrations:
```
flask db upgrade
```

6. Seed demo data:
```
flask seed-demo
flask seed-interests
```

7. Launch the app:
```
flask run
```
or
```
python run.py
```

8. Open your browser and go to `http://127.0.0.1:5000`

**Demo Accounts**

| Email | Password |
| :--- | :--- |
| alice@demo.com | password123 |
| bob@demo.com | password123 |
| charlie@demo.com | password123 |
| diana@demo.com | password123 |

> Demo accounts bypass email verification. Use these to explore the full app without any email setup.

### How to Run Tests
---
**Unit Tests**

Run from the root directory:
```
python -m pytest tests/test_auth.py tests/test_routes.py -v
```

**Selenium Tests**

Selenium tests require the app to be running first.

1. In one terminal, start the app and seed demo data:
```
flask db upgrade
flask seed-demo
flask seed-interests
flask run
```

2. In a second terminal, run the selenium tests:
```
python -m pytest tests/test_selenium.py -v
```

> Note: Selenium tests require Google Chrome to be installed. ChromeDriver is installed automatically via webdriver-manager.