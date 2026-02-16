// เปลี่ยน Sheet1 เป็นชื่อชีตของคุณถ้าไม่ได้ใช้ชื่อนี้
var SHEET_NAME = "Sheet1"; 

// ====== ฟังก์ชัน Helper =======
// ค้นหาดัชนีของคอลัมน์
function findColumnIndex(sheet, columnName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(columnName);
}

// ค้นหา email ในชีตและส่งกลับดัชนีแถว
function findEmailRow(sheet, email) {
  var data = sheet.getDataRange().getValues();
  var emailColIndex = findColumnIndex(sheet, 'email');
  
  if (emailColIndex === -1) {
    Logger.log('Error: email column not found');
    return -1;
  }
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][emailColIndex].toString().toLowerCase() === email.toString().toLowerCase()) {
      return i; // คืนดัชนี array (เริ่มจาก 0)
    }
  }
  return -1; // ไม่พบ
}

// 1. รับคำสั่งแบบ GET (ใช้สำหรับดึงข้อมูลไปโชว์ในหน้า Admin)
function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'getUsers') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data.shift(); // ดึงแถวแรก (หัวตาราง) ออกมา
    
    var users = data.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) {
        obj[header] = row[i];
      });
      return obj;
    });
    
    // ส่งข้อมูลกลับไปเป็น JSON
    return ContentService.createTextOutput(JSON.stringify(users))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. รับคำสั่งแบบ POST (ใช้สำหรับ สมัครสมาชิก และ ลบข้อมูล)
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var action = e.parameter.action;

  // --- ระบบลบผู้ใช้งาน (สำหรับ Admin หรือ Self-Delete) ---
  if (action === 'deleteUser') {
    var emailToDelete = e.parameter.email;
    
    if (!emailToDelete) {
      return ContentService.createTextOutput("Error: Email not provided");
    }

    var rowIndex = findEmailRow(sheet, emailToDelete);
    
    if (rowIndex !== -1) {
      // +1 เพราะ Array เริ่มที่ 0 แต่ชีตเริ่มที่ 1
      sheet.deleteRow(rowIndex + 1);
      Logger.log('User deleted: ' + emailToDelete);
      return ContentService.createTextOutput("Success");
    } else {
      Logger.log('User not found: ' + emailToDelete);
      return ContentService.createTextOutput("Error: User not found");
    }
  }

  // --- ระบบล็อกอิน (ตอบกลับเป็น JSON) ---
  if (action === 'login') {
    var email = (e.parameter.email || '').toString().toLowerCase();
    var password = e.parameter.password || '';

    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Email ไม่ถูกต้อง' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailColIndex = findColumnIndex(sheet, 'email');
    var pwdColIndex = findColumnIndex(sheet, 'password');

    if (emailColIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ไม่พบคอลัมน์ email' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    for (var i = 1; i < data.length; i++) {
      var rowEmail = (data[i][emailColIndex] || '').toString().toLowerCase();
      if (rowEmail === email) {
        var storedPwd = pwdColIndex !== -1 ? (data[i][pwdColIndex] || '').toString() : '';
        if (storedPwd === password) {
          // สร้าง user object จาก headers
          var user = {};
          for (var j = 0; j < headers.length; j++) {
            user[headers[j]] = data[i][j];
          }
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', user: user }))
                               .setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' }))
                               .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ไม่พบผู้ใช้งาน' }))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  // --- ระบบสมัครสมาชิก (โค้ดเดิมของคุณ) ---
  if (!action || action === 'register') {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (header.toLowerCase() === "timestamp") {
        newRow.push(new Date());
      } else {
        newRow.push(e.parameter[header] || "");
      }
    }
    sheet.appendRow(newRow);
    return ContentService.createTextOutput("Success");
  }
}