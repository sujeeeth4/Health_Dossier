const sessionKey = "health-dossier-doctor-session";

export function getDoctorSession() {
  return window.sessionStorage.getItem(sessionKey);
}

export function saveDoctorSession(doctorId: string) {
  window.sessionStorage.setItem(sessionKey, doctorId);
}

export function clearDoctorSession() {
  window.sessionStorage.removeItem(sessionKey);
}
