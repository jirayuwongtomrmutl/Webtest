window.logoutUser = function() {
        console.log('EF.js: logoutUser called');
        if (typeof Swal === 'undefined') {
            console.warn('SweetAlert (Swal) not loaded');
        }
        Swal.fire({
        title: 'ต้องการออกจากระบบหรือไม่ ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', // สีแดง (ตามปุ่ม Logout ของคุณ)
        cancelButtonColor: '#94a3b8',  // สีเทา
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true, // สลับปุ่มให้ปุ่มยืนยันอยู่ขวา (Optional)
        // บังคับให้ใช้ฟอนต์ Kanit
        didOpen: () => {
            const popup = Swal.getPopup();
            popup.style.fontFamily = '"Kanit", sans-serif';
            popup.style.borderRadius = '20px'; // ปรับความโค้งให้เข้ากับธีม
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. ลบข้อมูล Session
            localStorage.removeItem('currentUser'); 
            localStorage.removeItem('isAdmin'); // ลบ Admin ด้วย (ถ้ามี)

            // 2. แสดง Success เล็กน้อยก่อนเปลี่ยนหน้า (เพื่อให้ดูนุ่มนวล)
            Swal.fire({
                icon: 'success',
                title: 'ออกจากระบบเรียบร้อย',
                showConfirmButton: false,
                timer: 1500, // รอ 1.5 วินาที
                didOpen: () => {
                    Swal.getPopup().style.fontFamily = '"Kanit", sans-serif';
                    Swal.getPopup().style.borderRadius = '20px';
                }
            }).then(() => {
                    // 3. เปลี่ยนไปหน้า Login
                    window.location.href = 'login.html';
            });
        }
    });
}
    console.log('EF.js loaded');