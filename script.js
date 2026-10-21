
/* =========================================================
   PETUALANGAN SANAK DIGITAL - TIM BEDELAU
   script.js
   Fitur: Validasi, preview foto, kompresi, dan pengiriman
========================================================= */


/* =========================================================
   1. KONFIGURASI
========================================================= */

const CONFIG = {
  // Ganti dengan URL Web App Google Apps Script milikmu.
  // Contoh: https://script.google.com/macros/s/XXXXX/exec
  API_URL: "https://script.google.com/macros/s/AKfycbz7ZXyQi5K6gmDKHIEseAZZCQjxBqktmjwOsQ8cAiuX46ccq4_XhjV78GUgvKcRx5_IdQ/exec",

  MAX_FILE_SIZE: 10 * 1024 * 1024, // Maksimal 10 MB per foto
  MAX_IMAGE_DIMENSION: 1600,
  IMAGE_QUALITY: 0.75,

  ALLOWED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp"
  ]
};


/* =========================================================
   2. DAFTAR ELEMEN HTML
========================================================= */

const form = document.getElementById("merchantForm");
const submitButton = document.getElementById("submitButton");
const resetButton = document.getElementById("resetButton");

const completionPercent = document.getElementById("completionPercent");
const progressBar = document.getElementById("progressBar");

const consent = document.getElementById("consent");
const consentError = document.getElementById("consentError");

const toast = document.getElementById("toast");

const resultModal = document.getElementById("resultModal");
const resultSymbol = document.getElementById("resultSymbol");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const closeModal = document.getElementById("closeModal");

const resultModalContent = resultModal
  ? resultModal.querySelector(".result-modal")
  : null;


/* =========================================================
   3. DAFTAR FIELD WAJIB
========================================================= */

const textFieldIds = [
  "businessName",
  "ownerName",
  "ownerNik",
  "ownerPhone",
  "ownerEmail",
  "city",
  "bank",
  "nmid"
];

const photoFieldIds = [
  "ownerPhoto",
  "frontPhoto",
  "placedQrisPhoto",
  "qrisPhoto",
  "educationPhoto",
  "postTestStartPhoto",
  "postTestDonePhoto"
];

const totalRequiredFields =
  textFieldIds.length + photoFieldIds.length;


/* =========================================================
   4. NOTIFIKASI TOAST
========================================================= */

let toastTimeout;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}


/* =========================================================
   5. MODAL HASIL PENGIRIMAN
========================================================= */

function showResult(success, title, message) {
  if (!resultModal) {
    showToast(message);
    return;
  }

  if (resultModalContent) {
    resultModalContent.classList.toggle("error", !success);
  }

  if (resultSymbol) {
    resultSymbol.textContent = success ? "✓" : "!";
  }

  if (resultTitle) {
    resultTitle.textContent = title;
  }

  if (resultMessage) {
    resultMessage.textContent = message;
  }

  resultModal.classList.add("show");
  resultModal.setAttribute("aria-hidden", "false");

  if (closeModal) {
    closeModal.focus();
  }
}

function hideResult() {
  if (!resultModal) return;

  resultModal.classList.remove("show");
  resultModal.setAttribute("aria-hidden", "true");
}

if (closeModal) {
  closeModal.addEventListener("click", hideResult);
}

if (resultModal) {
  resultModal.addEventListener("click", (event) => {
    if (event.target === resultModal) {
      hideResult();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideResult();
  }
});


/* =========================================================
   6. MENGAMBIL ELEMEN FIELD
========================================================= */

function getField(id) {
  return document.getElementById(id);
}

function getFieldValue(id) {
  const element = getField(id);
  return element ? element.value.trim() : "";
}

function getErrorElement(field) {
  const container = field.closest(".field, .upload-field");

  return container
    ? container.querySelector(".field-error")
    : null;
}


/* =========================================================
   7. VALIDASI FIELD
========================================================= */

function clearFieldError(field) {
  if (!field) return;

  field.classList.remove("invalid");

  const container = field.closest(".upload-field");

  if (container) {
    container.classList.remove("invalid");
  }

  const errorElement = getErrorElement(field);

  if (errorElement) {
    errorElement.textContent = "";
  }
}

function setFieldError(field, message) {
  if (!field) return;

  field.classList.add("invalid");

  const container = field.closest(".upload-field");

  if (container) {
    container.classList.add("invalid");
  }

  const errorElement = getErrorElement(field);

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function validateTextField(id) {
  const field = getField(id);

  if (!field) return true;

  clearFieldError(field);

  const value = field.value.trim();

  if (!value) {
    setFieldError(field, "Kolom ini wajib diisi.");
    return false;
  }

  if (id === "ownerNik") {
    if (!/^\d{16}$/.test(value)) {
      setFieldError(
        field,
        "NIK harus terdiri dari tepat 16 digit angka."
      );

      return false;
    }
  }

  if (id === "ownerPhone") {
    // Nomor lokal Indonesia, diawali 08.
    if (!/^08\d{8,13}$/.test(value)) {
      setFieldError(
        field,
        "Masukkan nomor HP yang valid, diawali 08."
      );

      return false;
    }
  }

  if (id === "ownerEmail") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value)) {
      setFieldError(
        field,
        "Masukkan alamat email yang valid."
      );

      return false;
    }
  }

  return true;
}

function validatePhotoField(id) {
  const field = getField(id);

  if (!field) return true;

  clearFieldError(field);

  const file = field.files && field.files[0];

  if (!file) {
    setFieldError(field, "Foto ini wajib diunggah.");
    return false;
  }

  if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
    setFieldError(
      field,
      "Gunakan foto berformat JPG, PNG, atau WebP."
    );

    return false;
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    setFieldError(
      field,
      "Ukuran foto melebihi 10 MB. Pilih foto yang lebih kecil."
    );

    return false;
  }

  return true;
}

function validateConsent() {
  if (!consent) return true;

  if (!consent.checked) {
    if (consentError) {
      consentError.textContent =
        "Centang persetujuan sebelum mengirim data.";
    }

    return false;
  }

  if (consentError) {
    consentError.textContent = "";
  }

  return true;
}

function validateForm() {
  let isValid = true;

  textFieldIds.forEach((id) => {
    if (!validateTextField(id)) {
      isValid = false;
    }
  });

  photoFieldIds.forEach((id) => {
    if (!validatePhotoField(id)) {
      isValid = false;
    }
  });

  if (!validateConsent()) {
    isValid = false;
  }

  if (!isValid) {
    const firstInvalid = form.querySelector(
      ".invalid, input:invalid, select:invalid"
    );

    if (firstInvalid) {
      firstInvalid.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    showToast("Periksa kembali data yang belum valid.");
  }

  return isValid;
}


/* =========================================================
   8. PREVIEW FOTO
========================================================= */

const previewUrls = new Map();

function revokePreview(id) {
  const oldUrl = previewUrls.get(id);

  if (oldUrl) {
    URL.revokeObjectURL(oldUrl);
    previewUrls.delete(id);
  }
}

function showPhotoPreview(field) {
  const uploadField = field.closest(".upload-field");

  if (!uploadField) return;

  const preview = uploadField.querySelector(".upload-preview");
  const action = uploadField.querySelector(".upload-action");
  const file = field.files && field.files[0];

  clearFieldError(field);
  revokePreview(field.id);

  if (!file) {
    uploadField.classList.remove("has-file");

    if (preview) preview.replaceChildren();
    if (action) action.textContent = "Pilih foto";

    updateProgress();
    return;
  }

  if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
    field.value = "";

    uploadField.classList.remove("has-file");

    setFieldError(
      field,
      "Gunakan foto berformat JPG, PNG, atau WebP."
    );

    if (preview) preview.replaceChildren();
    if (action) action.textContent = "Pilih foto";

    updateProgress();
    return;
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    field.value = "";

    uploadField.classList.remove("has-file");

    setFieldError(
      field,
      "Ukuran foto maksimal 10 MB sebelum kompresi."
    );

    if (preview) preview.replaceChildren();
    if (action) action.textContent = "Pilih foto";

    updateProgress();
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  previewUrls.set(field.id, objectUrl);

  if (preview) {
    const image = document.createElement("img");

    image.src = objectUrl;
    image.alt = "Preview " + file.name;

    preview.replaceChildren(image);
  }

  uploadField.classList.add("has-file");

  if (action) {
    action.textContent = "Ganti foto";
  }

  updateProgress();
}


/* =========================================================
   9. KOMPRESI FOTO
========================================================= */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Foto tidak dapat dibaca."));
    };

    image.src = objectUrl;
  });
}

async function compressImage(file) {
  const image = await loadImage(file);

  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (!width || !height) {
    throw new Error("Dimensi foto tidak valid.");
  }

  const maxDimension = CONFIG.MAX_IMAGE_DIMENSION;
  const scale = Math.min(
    1,
    maxDimension / Math.max(width, height)
  );

  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser tidak mendukung kompresi foto.");
  }

  // JPEG tidak mendukung transparansi, jadi latar dibuat putih.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(
      resolve,
      "image/jpeg",
      CONFIG.IMAGE_QUALITY
    );
  });

  canvas.width = 0;
  canvas.height = 0;

  if (!blob) {
    throw new Error("Gagal mengompres foto.");
  }

  return blob;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      const commaIndex = result.indexOf(",");

      if (commaIndex === -1) {
        reject(new Error("Gagal membaca hasil kompresi."));
        return;
      }

      resolve(result.substring(commaIndex + 1));
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca foto."));
    };

    reader.readAsDataURL(blob);
  });
}

async function preparePhoto(fieldId) {
  const field = getField(fieldId);
  const file = field && field.files && field.files[0];

  if (!file) {
    throw new Error("Foto wajib belum dipilih: " + fieldId);
  }

  const compressedBlob = await compressImage(file);
  const base64 = await blobToBase64(compressedBlob);

  return {
    originalName: file.name,
    mimeType: "image/jpeg",
    size: compressedBlob.size,
    data: base64
  };
}


/* =========================================================
   10. PROGRESS KELENGKAPAN
========================================================= */

function updateProgress() {
  let completed = 0;

  textFieldIds.forEach((id) => {
    const field = getField(id);

    if (field && field.value.trim()) {
      completed++;
    }
  });

  photoFieldIds.forEach((id) => {
    const field = getField(id);

    if (field && field.files && field.files.length > 0) {
      const file = field.files[0];

      if (
        CONFIG.ALLOWED_TYPES.includes(file.type) &&
        file.size <= CONFIG.MAX_FILE_SIZE
      ) {
        completed++;
      }
    }
  });

  const percentage = Math.round(
    (completed / totalRequiredFields) * 100
  );

  if (completionPercent) {
    completionPercent.textContent = percentage + "%";
  }

  if (progressBar) {
    progressBar.style.width = percentage + "%";
  }
}


/* =========================================================
   11. MENGAMBIL DATA FORMULIR
========================================================= */

function collectMerchantData() {
  return {
    businessName: getFieldValue("businessName"),
    ownerName: getFieldValue("ownerName"),
    ownerNik: getFieldValue("ownerNik"),
    ownerPhone: getFieldValue("ownerPhone"),
    ownerEmail: getFieldValue("ownerEmail"),
    city: getFieldValue("city"),
    bank: getFieldValue("bank"),
    nmid: getFieldValue("nmid")
  };
}


/* =========================================================
   12. SIAPKAN 7 FOTO
========================================================= */

async function collectPhotos() {
  const photos = {};

  for (let index = 0; index < photoFieldIds.length; index++) {
    const fieldId = photoFieldIds[index];

    showToast(
      "Mengompres foto " +
      (index + 1) +
      " dari " +
      photoFieldIds.length +
      "..."
    );

    photos[fieldId] = await preparePhoto(fieldId);
  }

  return photos;
}


/* =========================================================
   13. KIRIM DATA KE GOOGLE APPS SCRIPT
========================================================= */

async function sendToGoogleAppsScript(payload) {
  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL === "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT"
  ) {
    throw new Error(
      "URL Google Apps Script belum diatur pada script.js."
    );
  }

  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(
      "Server memberikan status HTTP " + response.status + "."
    );
  }

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      "Respons server tidak valid. Periksa deployment Google Apps Script."
    );
  }

  if (result.success !== true) {
    throw new Error(
      result.message || "Server belum mengonfirmasi penyimpanan data."
    );
  }

  return result;
}


/* =========================================================
   14. STATUS TOMBOL KIRIM
========================================================= */

function setSubmitting(isSubmitting) {
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;

  if (isSubmitting) {
    submitButton.dataset.originalText =
      submitButton.querySelector("span")?.textContent ||
      "Kirim data merchant";

    const label = submitButton.querySelector("span");

    if (label) {
      label.textContent = "Sedang mengirim...";
    }
  } else {
    const label = submitButton.querySelector("span");

    if (label) {
      label.textContent =
        submitButton.dataset.originalText ||
        "Kirim data merchant";
    }
  }

  if (resetButton) {
    resetButton.disabled = isSubmitting;
  }
}


/* =========================================================
   15. EVENT INPUT TEKS
========================================================= */

textFieldIds.forEach((id) => {
  const field = getField(id);

  if (!field) return;

  field.addEventListener("input", () => {
    clearFieldError(field);
    updateProgress();
  });

  field.addEventListener("change", () => {
    validateTextField(id);
    updateProgress();
  });
});


/* =========================================================
   16. EVENT UNGGAH FOTO
========================================================= */

photoFieldIds.forEach((id) => {
  const field = getField(id);

  if (!field) return;

  field.addEventListener("change", () => {
    showPhotoPreview(field);
  });
});


/* =========================================================
   17. EVENT PERSETUJUAN
========================================================= */

if (consent) {
  consent.addEventListener("change", () => {
    if (consentError) {
      consentError.textContent = consent.checked
        ? ""
        : "Centang persetujuan sebelum mengirim data.";
    }
  });
}


/* =========================================================
   18. KIRIM FORMULIR
========================================================= */

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      showToast("Menyiapkan data merchant...");

      const merchant = collectMerchantData();
      const photos = await collectPhotos();

      const payload = {
        action: "submitMerchant",
        submittedAt: new Date().toISOString(),
        merchant: merchant,
        photos: photos,
        consent: true
      };

      showToast("Mengirim data ke server...");

      const result = await sendToGoogleAppsScript(payload);

      showResult(
        true,
        "Data berhasil dikirim!",
        result.message ||
          "Data merchant telah dikonfirmasi oleh server."
      );

      // Form hanya dikosongkan setelah server mengonfirmasi sukses.
      form.reset();

      photoFieldIds.forEach((id) => {
        const field = getField(id);

        if (field) {
          revokePreview(id);

          const uploadField = field.closest(".upload-field");
          const preview = uploadField?.querySelector(".upload-preview");
          const action = uploadField?.querySelector(".upload-action");

          if (uploadField) {
            uploadField.classList.remove("has-file", "invalid");
          }

          if (preview) {
            preview.replaceChildren();
          }

          if (action) {
            action.textContent = "Pilih foto";
          }
        }
      });

      textFieldIds.forEach((id) => {
        clearFieldError(getField(id));
      });

      if (consentError) {
        consentError.textContent = "";
      }

      updateProgress();

    } catch (error) {
      console.error("Pengiriman data gagal:", error);

      showResult(
        false,
        "Pengiriman belum berhasil",
        error.message ||
          "Terjadi kesalahan. Periksa koneksi dan coba kembali."
      );
    } finally {
      setSubmitting(false);
    }
  });
}


/* =========================================================
   19. KOSONGKAN FORMULIR
========================================================= */

if (form) {
  form.addEventListener("reset", () => {
    // Reset event berjalan sebelum nilai input benar-benar dikosongkan.
    setTimeout(() => {
      textFieldIds.forEach((id) => {
        clearFieldError(getField(id));
      });

      photoFieldIds.forEach((id) => {
        const field = getField(id);

        if (!field) return;

        revokePreview(id);

        const uploadField = field.closest(".upload-field");
        const preview = uploadField?.querySelector(".upload-preview");
        const action = uploadField?.querySelector(".upload-action");

        if (uploadField) {
          uploadField.classList.remove("has-file", "invalid");
        }

        if (preview) {
          preview.replaceChildren();
        }

        if (action) {
          action.textContent = "Pilih foto";
        }
      });

      if (consentError) {
        consentError.textContent = "";
      }

      updateProgress();
    }, 0);
  });
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin mengosongkan seluruh formulir?"
    );

    if (!confirmed) {
      // Batalkan aksi reset bawaan browser.
      // Event reset tidak akan dibatalkan hanya dengan return.
      return;
    }
  });
}


/* =========================================================
   20. INISIALISASI
========================================================= */

updateProgress();

console.log(
  "Petualangan Sanak Digital - Tim Bedelau siap digunakan."
);
