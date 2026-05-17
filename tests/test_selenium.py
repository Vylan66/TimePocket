import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoAlertPresentException, UnexpectedAlertPresentException
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = 'http://127.0.0.1:5000'

@pytest.fixture(scope='module')
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    d = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    d.implicitly_wait(3)
    yield d
    d.quit()

def dismiss_any_alert(driver):
    try:
        WebDriverWait(driver, 2).until(EC.alert_is_present())
        driver.switch_to.alert.dismiss()
    except Exception:
        pass

def ensure_logged_out(driver):
    driver.get(f'{BASE_URL}/logout')
    time.sleep(0.5)

def login(driver):
    ensure_logged_out(driver)
    driver.get(f'{BASE_URL}/')
    WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, 'btn-nav-login')))
    driver.find_element(By.ID, 'btn-nav-login').click()
    WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.ID, 'login-email')))
    driver.find_element(By.ID, 'login-email').clear()
    driver.find_element(By.ID, 'login-email').send_keys('alice@demo.com')
    driver.find_element(By.ID, 'login-password').clear()
    driver.find_element(By.ID, 'login-password').send_keys('password123')
    driver.find_element(By.ID, 'btn-login-submit').click()
    dismiss_any_alert(driver)
    WebDriverWait(driver, 10).until(EC.url_contains("/personal")) 

def test_login_page_loads(driver):
    ensure_logged_out(driver)
    driver.get(f'{BASE_URL}/')
    assert 'TimePocket' in driver.title

def test_login_overlay_opens(driver):
    ensure_logged_out(driver)
    driver.get(f'{BASE_URL}/')
    WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, 'btn-nav-login')))
    driver.find_element(By.ID, 'btn-nav-login').click()
    WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.ID, 'login-email')))
    assert driver.find_element(By.ID, 'login-email').is_displayed()

def test_login_success(driver):
    login(driver)
    assert "/personal" in driver.current_url

def test_personal_page_loads(driver):
    login(driver)
    driver.get(f'{BASE_URL}/personal')
    assert '/personal' in driver.current_url

def test_logout(driver):
    login(driver)
    ensure_logged_out(driver)
    assert '/personal' not in driver.current_url