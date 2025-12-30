// File: client/src/hooks/useWindowSize.js
// Ini adalah 'alat' bantu untuk mendeteksi lebar layar

import { useState, useEffect } from "react";

export default function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // Fungsi yang akan dijalankan saat ukuran jendela berubah
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Daftarkan 'event listener'
    window.addEventListener("resize", handleResize);

    // Panggil sekali saat inisialisasi untuk mendapatkan ukuran awal
    handleResize();

    // 'Cleanup' fungsi: Hapus listener saat komponen tidak lagi digunakan
    return () => window.removeEventListener("resize", handleResize);
  }, []); // [] berarti efek ini hanya jalan sekali (saat 'mount')

  return windowSize;
}
