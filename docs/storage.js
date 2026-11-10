"use strict";
class GitHubStore {
  constructor() {
    this.url = "https://api.github.com/repos/paninmaksimru-del/zadachi_sherpa/contents/data/report.json";
    this.token = ""; this.sha = null; this.ready = false; this.saving = false;
  }
  async request(method = "GET", body) {
    const response = await fetch(this.url + (method === "GET" ? "?ref=main" : ""), {
      method, cache: "no-store", redirect: "error",
      headers: {Accept: "application/vnd.github+json", ...(this.token ? {Authorization: "Bearer " + this.token} : {}),
        "X-GitHub-Api-Version": "2022-11-28", ...(body ? {"Content-Type":"application/json"} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
    if (!response.ok) {
      const messages = {
        401: "Токен недействителен или истёк. Войдите с новым токеном.",
        403: "GitHub отклонил запрос: проверьте права Contents и лимит запросов.",
        404: "Нет доступа к репозиторию или файлу. Проверьте выбранный репозиторий в настройках токена.",
        409: "Таблицу уже изменили в другой вкладке. Ваш черновик сохранён на экране. Скопируйте нужные правки, затем нажмите «Обновить».",
        422: "GitHub не принял сохранение. Проверьте права Contents: Read and write и актуальность версии."
      };
      throw new Error(messages[response.status] || "Ошибка GitHub (" + response.status + "). Попробуйте ещё раз.");
    }
    return response.json();
  }
  validate(data) {
    if (!data || typeof data.reportDate !== "string" || !Array.isArray(data.sections) || !data.sections.length ||
      !Array.isArray(data.tasks) || !Array.isArray(data.bugs) || !Array.isArray(data.changes) ||
      data.sections.some(s => !s || typeof s.title !== "string") ||
      data.tasks.some(t => !t || typeof t.name !== "string" || !Number.isInteger(t.sec) || t.sec < 0 || t.sec >= data.sections.length || !["plan","work","done","archive"].includes(t.col)))
      throw new Error("Файл таблицы повреждён или имеет неподдерживаемый формат.");
    return data;
  }
  async load() {
    const file = await this.request();
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), c => c.charCodeAt(0));
    const data = this.validate(JSON.parse(new TextDecoder().decode(bytes)));
    this.sha = file.sha; this.ready = true;
    return data;
  }
  async save(data) {
    if (!this.ready || !this.sha) throw new Error("Сначала откройте таблицу из GitHub.");
    this.validate(data);
    const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n");
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const result = await this.request("PUT", {branch:"main", sha:this.sha,
      message:"Обновление таблицы · " + new Date().toISOString(), content:btoa(binary)});
    this.sha = result.content.sha;
  }
  disconnect() {this.token = ""; this.sha = null; this.ready = false;}
}
const repo = new GitHubStore();
