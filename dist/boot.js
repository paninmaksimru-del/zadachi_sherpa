"use strict";
function setSync(message, error = false) {
  const el = document.getElementById("sync-status");
  el.textContent = message; el.dataset.error = String(error);
}
function displayData(data) {
  DATA = data; draft = null;
  document.getElementById("page").hidden = false;
  document.getElementById("syncbar").hidden = false;
  document.getElementById("connection").hidden = true;
  render(); setSync("Загружено из приватного GitHub");
}
document.getElementById("connect-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = document.getElementById("connect");
  const field = document.getElementById("github-token");
  const error = document.getElementById("connection-error");
  repo.token = field.value.trim(); field.value = "";
  button.disabled = true; button.textContent = "Открываю…"; error.textContent = "";
  try { displayData(await repo.load()); }
  catch (err) { repo.disconnect(); error.textContent = err.message; }
  finally {button.disabled = false; button.textContent = "Открыть таблицу";}
});
document.getElementById("refresh").addEventListener("click", async () => {
  if (repo.saving) return;
  if (draft && !confirm("Обновление отменит несохранённые правки. Продолжить?")) return;
  const button = document.getElementById("refresh"); button.disabled = true;
  document.getElementById("page").inert = true;
  try {displayData(await repo.load());} catch (err) {setSync(err.message, true);}
  finally {button.disabled = false; document.getElementById("page").inert = false;}
});
document.getElementById("logout").addEventListener("click", () => {
  if (repo.saving) return;
  if (draft && !confirm("Выйти и отменить несохранённые правки?")) return;
  repo.disconnect(); location.reload();
});
window.addEventListener("beforeunload", event => {
  if (draft || repo.saving) {event.preventDefault(); event.returnValue = "";}
});
