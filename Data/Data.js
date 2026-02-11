// URL ของ Google Apps Script
const scriptURL = 'https://script.google.com/macros/s/AKfycbxFiw7NPm-UQMEAKgpVCarOTCWuPE5HGi4ppPfU_uNSkh4Io65EIBr0-vV5EDuecJp6zA/exec';

// ========== USER MANAGEMENT SYSTEM ==========
class UserManager {
  constructor() {
    this.users = this.loadUsers();
  }

  // โหลด users จาก localStorage
  loadUsers() {
    const stored = localStorage.getItem('users');
    return stored ? JSON.parse(stored) : [];
  }

  // บันทึก users ลง localStorage
  saveUsers() {
    localStorage.setItem('users', JSON.stringify(this.users));
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
  login(email, password) {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
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

  form.addEventListener('submit', e => {
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
          alert('โปรดกรอกข้อมูลให้ครบถ้วน');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ตรวจสอบรูปแบบอีเมล
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          alert('โปรดกรอกอีเมลให้ถูกต้อง');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ตรวจสอบว่ารหัสผ่านตรงกันไหม
        if (password !== confirmPassword) {
          alert('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ตรวจสอบความยาวรหัสผ่าน
        if (password.length < 6) {
          alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        // ลงทะเบียน
        const result = userManager.register(firstname, lastname, email, password);
        alert(result.message);
        if (result.success) {
          form.reset();
          setTimeout(() => window.location.href = 'login.html', 1500);
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
          alert('โปรดกรอกอีเมลและรหัสผ่าน');
          btn.innerText = originalText;
          btn.disabled = false;
          return;
        }

        const result = userManager.login(email, password);
        alert(result.message);
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
      alert('เกิดข้อผิดพลาด');
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
  // --- User Session Logic ---
      
      // 1. ตรวจสอบว่าล็อกอินหรือยัง
      function checkUserSession() {
          const userStr = localStorage.getItem('currentUser');
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