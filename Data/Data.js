// URL ของ Google Apps Script
const scriptURL = 'https://script.google.com/macros/s/AKfycbwVbfFQ_hsGmDksTlg4PRKkfXYk7X8lufaLyiBZTxyNy_8W66RZb55w8A7xmpxnZ9ggrQ/exec';

// Helper แสดงข้อความ: ใช้ SweetAlert ถ้ามี, ไม่เช่นนั้น fallback เป็น alert
function showMessage(message, icon = 'info', title = '') {
  if (window.Swal) {
    Swal.fire({
      title: title || undefined,
      text: message,
      icon: icon,
      confirmButtonText: 'ตกลง'
    });
  } else {
    alert(message);
  }
}

// ========== USER MANAGEMENT SYSTEM ==========
class UserManager {
  constructor() {
    this.users = this.loadUsers();
  }

  // โหลด users จาก localStorage
  loadUsers() {
    const stored = sessionStorage.getItem('users');
    return stored ? JSON.parse(stored) : [];
  }

  // บันทึก users ลง localStorage
  saveUsers() {
    sessionStorage.setItem('users', JSON.stringify(this.users));
  }

  // ลงทะเบียน user ใหม่
  register(firstname, lastname, email, password) {
    // ตรวจสอบว่า email มีอยู่แล้วหรือไม่
    if (this.users.some(u => u.email === email)) {
      return { success: false, message: 'อีเมลนี้ลงทะเบียนแล้ว' };
    }

    // เพิ่ม user ใหม่
    const newUser = { firstname, lastname, email, password, createdAt: new Date().toLocaleString() };
    this.users.push(newUser);
    this.saveUsers();

    // ส่งข้อมูลไป Google Apps Script
    this.sendToGoogleSheet(newUser);

    return { success: true, message: 'สมัครสมาชิกสำเร็จ!' };
  }

  // ตรวจสอบ login
  // ดึงรายการผู้ใช้จาก Google Apps Script (อัปเดต local storage)
  async fetchUsers() {
    try {
      const res = await fetch(`${scriptURL}?action=getUsers`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      // ถ้าได้ข้อมูล ให้อัปเดตรายการผู้ใช้และบันทึกลง localStorage
      if (Array.isArray(data)) {
        this.users = data;
        this.saveUsers();
      }
      return { success: true };
    } catch (err) {
      console.warn('fetchUsers failed, using local users:', err);
      return { success: false, error: err };
    }
  }

  // ตรวจสอบ login (ตอนนี้เป็น async เพื่อให้แน่ใจว่าใช้รายการผู้ใช้ปัจจุบันจากเซิร์ฟเวอร์)
  async login(email, password) {
    await this.fetchUsers();
    const user = this.users.find(u => u.email === email && u.password === password);
    if (user) {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      return { success: true, message: 'เข้าสู่ระบบสำเร็จ!', user };
    }
    return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  }

  // ส่งข้อมูลไป Google Apps Script
  sendToGoogleSheet(data) {
    const formData = new FormData();
    formData.append('firstname', data.firstname);
    formData.append('lastname', data.lastname);
    formData.append('email', data.email);
    formData.append('timestamp', data.createdAt);
    formData.append('password', data.password); // เพิ่มรหัสผ่านลงในข้อมูลที่ส่ง
    

    fetch(scriptURL, {
      method: 'POST',
      body: formData
    })
    .then(response => console.log('ส่งข้อมูลไป Google Sheets สำเร็จ'))
    .catch(error => console.error('Error sending to Google Sheet:', error));
  }
}

// สร้าง instance ของ UserManager
const userManager = new UserManager();

// ========== FORM HANDLERS ==========
const form = document.querySelector('.form');

if (form) {
  // ตรวจสอบว่าเป็น login หรือ register
  const isLoginPage = form.querySelector('label:has(input[name="email"]) + label:has(input[name="password"])') !== null && 
                      !form.querySelector('input[name="firstname"]');
  const isRegisterPage = form.querySelector('input[name="firstname"]') !== null;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('.submit');
    const originalText = btn.innerText;
    btn.innerText = 'กำลังประมวลผล...';
    btn.disabled = true;

    try {
      if (isRegisterPage) {
        // ประมวลผลการสมัครสมาชิก
        const firstname = form.querySelector('input[name="firstname"]').value.trim();
        const lastname = form.querySelector('input[name="lastname"]').value.trim();
        const email = form.querySelector('input[name="email"]').value.trim();
        const password = form.querySelector('input[name="password"]').value;
        const confirmPassword = form.querySelector('input[name="confirm_password"]').value;

        // ตรวจสอบว่าข้อมูลถูกกรอกครบถ้วน
        if (!firstname || !lastname || !email || !password || !confirmPassword) {
           showMessage('โปรดกรอกข้อมูลให้ครบถ้วน', 'warning');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ตรวจสอบรูปแบบอีเมล
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
           showMessage('โปรดกรอกอีเมลให้ถูกต้อง', 'warning');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ตรวจสอบว่ารหัสผ่านตรงกันไหม
        if (password !== confirmPassword) {
           showMessage('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง', 'error');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ตรวจสอบความยาวรหัสผ่าน
        if (password.length < 6) {
           showMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ลงทะเบียน
        const result = await userManager.register(firstname, lastname, email, password);
          showMessage(result.message, result.success ? 'success' : 'error');
        if (result.success) {
          form.reset();
          setTimeout(() => window.location.href = 'Login.html', 1500);
        } else {
          btn.innerText = originalText;
          btn.disabled = false;
        }
      } else if (isLoginPage) {
        // ประมวลผลการเข้าสู่ระบบ
        const email = form.querySelector('input[name="email"]').value.trim();
        const password = form.querySelector('input[name="password"]').value;

        // ตรวจสอบว่าข้อมูลถูกกรอกครบถ้วน
        if (!email || !password) {
           showMessage('โปรดกรอกอีเมลและรหัสผ่าน', 'warning');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        const result = await userManager.login(email, password);
          showMessage(result.message, result.success ? 'success' : 'error');
        if (result.success) {
          form.reset();
          setTimeout(() => window.location.href = 'index.html', 1500);
        } else {
          btn.innerText = originalText;
          btn.disabled = false;
        }
      }
    } catch (error) {
      console.error('Error:', error);
        showMessage('เกิดข้อผิดพลาด', 'error');
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
  // --- User Session Logic ---
      
        // 1. ตรวจสอบว่าล็อกอินหรือยัง
        function checkUserSession() {
          const userStr = sessionStorage.getItem('currentUser');
          const userName = document.getElementById('userName');
          const inputName = document.getElementById('inputName');
          
          // ตรวจสอบว่าองค์ประกอบเหล่านี้มีอยู่หรือไม่ (เพื่อหลีกเลี่ยง error บนหน้า login/register)
          if (!userName && !inputName) {
              return;
          }
          
          if (!userStr) {
              // ถ้าไม่มีข้อมูล ให้เด้งไปหน้า Login
              window.location.href = 'login.html';
              return;
          }

          const user = JSON.parse(userStr);
          // แสดงชื่อผู้ใช้
          if (userName) {
              userName.innerText = user.firstname || user.email;
          }
          
          // (Option) เติมชื่อผู้จองให้อัตโนมัติใน Modal จอง
          if (inputName) {
              inputName.value = `${user.firstname} ${user.lastname}`;
          }
      }

      // เรียกใช้งานฟังก์ชันเมื่อหน้าเว็บโหลด
      checkUserSession();
}