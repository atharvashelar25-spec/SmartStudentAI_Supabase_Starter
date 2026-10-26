(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { supabase: null, user: null, predictions: [], resume: null, jobs: [], toastTimer: null };
  const roleSkills = {
    "Data Analyst": ["python","sql","excel","power bi","tableau","statistics","data visualization"],
    "Junior Data Scientist": ["python","sql","pandas","numpy","statistics","machine learning","data visualization"],
    "Machine Learning Intern": ["python","numpy","pandas","scikit-learn","machine learning","statistics","deep learning"],
    "Python Developer": ["python","git","sql","api","fastapi","django","testing"],
    "Business Intelligence Analyst": ["sql","excel","power bi","tableau","data visualization","statistics","business analysis"],
    "AI/ML Intern": ["python","numpy","pandas","machine learning","deep learning","scikit-learn","tensorflow"]
  };
  const jobs = [
    {title:"Data Analyst",level:"Entry level",location:"Sample · Remote-friendly",required:["python","sql","excel","statistics","data visualization"],preferred:["power bi","tableau"],description:"Explore datasets, clean data, build dashboards, and communicate insights to business teams.",projects:["Sales dashboard","Exploratory data analysis"],learning:["SQL joins","Power BI or Tableau"]},
    {title:"Junior Data Scientist",level:"Entry level",location:"Sample · Hybrid",required:["python","pandas","numpy","statistics","machine learning"],preferred:["sql","scikit-learn"],description:"Prepare data, build baseline predictive models, evaluate metrics, and explain results.",projects:["Student score predictor","Customer segmentation"],learning:["Feature engineering","Model evaluation"]},
    {title:"Machine Learning Intern",level:"Internship",location:"Sample · Remote-friendly",required:["python","numpy","pandas","machine learning","scikit-learn"],preferred:["statistics","deep learning"],description:"Support ML experiments, compare models, document metrics, and help prepare datasets.",projects:["House price regression","Text classification"],learning:["Cross-validation","Model pipelines"]},
    {title:"Python Developer",level:"Entry level",location:"Sample · On-site / Hybrid",required:["python","git","sql","api","testing"],preferred:["fastapi","django"],description:"Develop Python services, connect databases, write tests, and integrate REST APIs.",projects:["Task manager API","Student record system"],learning:["REST API design","Automated testing"]},
    {title:"Business Intelligence Analyst",level:"Entry level",location:"Sample · Hybrid",required:["sql","excel","power bi","data visualization","business analysis"],preferred:["tableau","statistics"],description:"Turn operational data into reports, dashboards, and measurable business insights.",projects:["College attendance dashboard","Retail KPI report"],learning:["Data modelling","Dashboard storytelling"]},
    {title:"AI/ML Intern",level:"Internship",location:"Sample · Remote-friendly",required:["python","numpy","pandas","machine learning","statistics"],preferred:["deep learning","scikit-learn"],description:"Explore AI use cases, prepare datasets, test models, and document reproducible results.",projects:["Spam classifier","Recommendation prototype"],learning:["Classification metrics","Responsible AI"]}
  ];
  state.jobs = jobs;

  function toast(message, error = false) {
    const el = $("#toast"); el.textContent = message; el.classList.toggle("error", error); el.classList.add("show");
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function getConfig() {
    return { url: ($("#supabaseUrl")?.value || window.APP_CONFIG?.SUPABASE_URL || "").trim(), key: ($("#supabaseKey")?.value || window.APP_CONFIG?.SUPABASE_ANON_KEY || "").trim() };
  }
  function navigate(page) {
    const valid = ["dashboard","predict","resume","jobs","history","profile","about"];
    if (!valid.includes(page)) page = "dashboard";
    $$(".page").forEach(el => el.classList.toggle("active", el.id === `page-${page}`));
    $$(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === page));
    const title = {dashboard:"Dashboard",predict:"Performance Prediction",resume:"Resume Analyzer",jobs:"Job Recommendations",history:"Prediction History",profile:"Profile & Settings",about:"About the Project"};
    $("#pageTitle").textContent = title[page]; $("#sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
    if (page === "history") loadHistory();
    if (page === "jobs") renderJobs();
  }
  function wireNavigation() {
    $$(".nav-item").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page)));
    $$("[data-goto]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.goto)));
    $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    $("#profileShortcut").addEventListener("click", () => state.user ? navigate("profile") : authMenu());
    $(".status-pill").addEventListener("click", authMenu);
    $("#logoutBtn").addEventListener("click", async () => {
      if (!state.supabase) return toast("Configure Supabase first in Profile & Settings.", true);
      if (!state.user) return authMenu();
      const {error} = await state.supabase.auth.signOut();
      if (error) return toast(error.message, true);
      state.user = null; updateConnectionBadge(true); toast("Signed out successfully.");
    });
  }
  let authMode = "login";
  function setAuthMode(mode) {
    authMode = mode === "register" ? "register" : "login";
    const registering = authMode === "register";
    $("#authTitle").textContent = registering ? "Create your account" : "Welcome back";
    $("#authSubtitle").textContent = registering ? "Register to save your predictions and track progress." : "Sign in to save and view your private predictions.";
    $("#authSubmit").textContent = registering ? "Create account →" : "Login →";
    $("#authPassword").setAttribute("autocomplete", registering ? "new-password" : "current-password");
    $("#showLogin").classList.toggle("selected", !registering);
    $("#showRegister").classList.toggle("selected", registering);
  }
  function closeAuthModal() { $("#authModal").hidden = true; }
  function openAuthModal(mode = "login") {
    if (!state.supabase) {
      toast("First save your Supabase URL and publishable/anon key in Profile & Settings.", true);
      navigate("profile");
      return;
    }
    if (state.user) {
      toast("Signed in as " + (state.user.email || "your account") + ". Use the bottom-left arrow to sign out.");
      return;
    }
    setAuthMode(mode);
    $("#authModal").hidden = false;
    setTimeout(() => $("#authEmail").focus(), 0);
  }
  async function authMenu() { openAuthModal("login"); }
  async function submitAuth(e) {
    e.preventDefault();
    if (!state.supabase) return toast("Configure Supabase first in Profile & Settings.", true);
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;
    if (password.length < 6) return toast("Password must be at least 6 characters.", true);
    const button = $("#authSubmit");
    button.disabled = true;
    button.textContent = authMode === "register" ? "Creating account…" : "Signing in…";
    try {
      if (authMode === "register") {
        const { data, error } = await state.supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session && data.user) {
          state.user = data.user;
          closeAuthModal();
          updateConnectionBadge(true);
          toast("Account created and signed in successfully.");
          await loadHistory();
        } else {
          closeAuthModal();
          toast("Registration submitted. Check your email to confirm the account, then log in.");
          openAuthModal("login");
        }
      } else {
        const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user;
        closeAuthModal();
        updateConnectionBadge(true);
        toast("Signed in successfully.");
        await loadHistory();
        await loadResumeSummary();
      }
    } catch (err) {
      toast(err.message || "Authentication failed.", true);
    } finally {
      button.disabled = false;
      setAuthMode(authMode);
    }
  }
  async function initSupabase() {
    const savedUrl = localStorage.getItem("studentai_supabase_url") || window.APP_CONFIG?.SUPABASE_URL || "";
    const savedKey = localStorage.getItem("studentai_supabase_key") || window.APP_CONFIG?.SUPABASE_ANON_KEY || "";
    $("#supabaseUrl").value = savedUrl; $("#supabaseKey").value = savedKey;
    if (!savedUrl || !savedKey) { updateConnectionBadge(false); return; }
    if (!window.supabase?.createClient) { toast("Supabase client could not load. Check your internet connection.",true); return; }
    try {
      state.supabase = window.supabase.createClient(savedUrl, savedKey);
      const {data,error} = await state.supabase.auth.getSession();
      if (error) throw error;
      state.user = data.session?.user || null;
      updateConnectionBadge(true);
      state.supabase.auth.onAuthStateChange((_event, session) => {
        state.user = session?.user || null;
        updateConnectionBadge(true);
      });
      if (state.user) { await loadHistory(); await loadResumeSummary(); }
      toast(state.user ? "Supabase connected. Signed-in session restored." : "Supabase connected. Register or sign in to access private data.");
    } catch(e) { state.supabase = null; updateConnectionBadge(false); toast("Supabase connection failed: " + e.message,true); }
  }
  function updateConnectionBadge(connected) {
    const el = $(".status-pill");
    el.innerHTML = `<i></i>${connected ? (state.user ? "Connected · signed in" : "Connected · sign in") : "Supabase not configured"}`;
    el.style.background = connected ? "#e8f8f1" : "#fff4e7"; el.style.color = connected ? "#258b73" : "#b77932";
    const name = $(".sidebar-bottom strong");
    const sub = $(".sidebar-bottom small");
    if (name) name.textContent = state.user?.email || "Student User";
    if (sub) sub.textContent = state.user ? "Signed in" : "AI & Data Science";
  }
  async function ensureUser() {
    if (!state.supabase) { toast("Connect Supabase in Profile & Settings and follow README setup.",true); navigate("profile"); return false; }
    if (!state.user) { toast("Please sign in to save and view private records. Configure Supabase Auth first.",true); return false; }
    return true;
  }
  function estimatePrediction(v) {
    // Transparent demo baseline only; replace with a trained server-side model for real evaluation.
    const studyScore = Math.min(100, v.weekly_study_hours * 4);
    const completionScore = Math.min(100, v.completed_assignments * 10);
    const score = Math.max(0, Math.min(100,
      .25*v.attendance + .25*v.previous_marks + .15*v.assignment_average +
      .20*v.internal_marks + .075*studyScore + .075*completionScore));
    const category = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Needs improvement" : "At risk";
    const suggestions = [];
    if(v.attendance < 75) suggestions.push("Work toward at least 75% attendance, following your college policy.");
    if(v.previous_marks < 65) suggestions.push("Revise previous exam topics and practice timed questions.");
    if(v.assignment_average < 70) suggestions.push("Review assignment feedback and submit work consistently.");
    if(v.internal_marks < 65) suggestions.push("Make a weekly revision plan for internal assessments.");
    if(v.weekly_study_hours < 10) suggestions.push("Try adding focused study sessions across the week.");
    if(v.completed_assignments < 8) suggestions.push("Break remaining assignments into small, scheduled tasks.");
    if(!suggestions.length) suggestions.push("Maintain your current routine and revisit weak topics each week.");
    return {predicted_score:Math.round(score*10)/10,category,suggestions,model_type:"transparent_demo_baseline"};
  }
  function formValues(form) {
    const fd = new FormData(form), out = {};
    for (const [k,v] of fd.entries()) out[k] = k === "student_identifier" ? v.trim() : Number(v);
    return out;
  }
  async function savePrediction(input, result) {
    if (!(await ensureUser())) return false;
    const row = {user_id:state.user.id, student_identifier:input.student_identifier, attendance:input.attendance, previous_marks:input.previous_marks, assignment_average:input.assignment_average, internal_marks:input.internal_marks, weekly_study_hours:input.weekly_study_hours, completed_assignments:input.completed_assignments, predicted_score:result.predicted_score, category:result.category, model_type:result.model_type};
    const {error} = await state.supabase.from("performance_predictions").insert(row);
    if (error) { toast("Prediction calculated, but saving failed: "+error.message,true); return false; }
    toast("Prediction saved securely to your Supabase account."); await loadHistory(); return true;
  }
  function renderPrediction(result, saved) {
    $("#predictionResult").innerHTML = `<div class="result-symbol">◈</div><span class="eyebrow">ESTIMATED FINAL SCORE</span><div class="result-score">${result.predicted_score}%</div><span class="category-pill">${escapeHtml(result.category)}</span><div class="result-subgrid"><div class="result-mini"><small>Model</small><strong>Demo baseline</strong></div><div class="result-mini"><small>Saved</small><strong>${saved?"Yes":"No"}</strong></div></div><strong>Suggested next steps</strong><ul class="suggestions">${result.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul><p>Estimate only—not a guaranteed result. The current baseline is not a validated ML model.</p>`;
    $("#statScore").textContent = result.predicted_score + "%"; $("#statScoreNote").textContent = result.category;
  }
  async function onPrediction(e) {
    e.preventDefault(); const form = e.currentTarget; if (!form.reportValidity()) return;
    const input = formValues(form);
    if (input.weekly_study_hours < 0 || input.completed_assignments < 0) return toast("Study hours and assignment count cannot be negative.",true);
    const btn = $("#predictBtn"); btn.disabled = true; btn.textContent = "Calculating…";
    try { const result = estimatePrediction(input); renderPrediction(result,false); const saved = await savePrediction(input,result); $("#predictionResult .result-mini:last-child strong").textContent = saved?"Yes":"No"; }
    catch(err) { toast("Could not calculate prediction: "+err.message,true); }
    finally { btn.disabled = false; btn.innerHTML = 'Generate prediction <span>→</span>'; }
  }
  async function loadHistory() {
    if (!state.supabase || !state.user) { $("#historyBody").innerHTML = '<tr><td colspan="4" class="table-empty">Connect Supabase and sign in to view private prediction history.</td></tr>'; $("#statPredictions").textContent = "0"; drawChart([]); return; }
    const {data,error} = await state.supabase.from("performance_predictions").select("id,student_identifier,predicted_score,category,created_at").order("created_at",{ascending:false}).limit(30);
    if (error) { $("#historyBody").innerHTML = `<tr><td colspan="4" class="table-empty">${escapeHtml(error.message)}</td></tr>`; toast("Could not load history.",true); return; }
    state.predictions = data || []; $("#statPredictions").textContent = String(state.predictions.length);
    if (!state.predictions.length) $("#historyBody").innerHTML = '<tr><td colspan="4" class="table-empty">No saved predictions yet. Run a prediction first.</td></tr>';
    else $("#historyBody").innerHTML = state.predictions.map(p=>`<tr><td>${escapeHtml(p.student_identifier)}</td><td><strong>${Number(p.predicted_score).toFixed(1)}%</strong></td><td>${escapeHtml(p.category)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join("");
    if(state.predictions[0]) { $("#statScore").textContent=Number(state.predictions[0].predicted_score).toFixed(1)+"%"; $("#statScoreNote").textContent=state.predictions[0].category; }
    drawChart([...state.predictions].reverse().slice(-7));
  }
  function drawChart(data) {
    const chart = $("#scoreChart");
    if (!data.length) { chart.innerHTML='<div class="empty-chart">Your saved predictions will appear here.</div>'; return; }
    chart.innerHTML=data.map((p,i)=>`<div class="bar-group" title="${escapeHtml(p.student_identifier)}: ${p.predicted_score}%"><div class="bar" style="height:${Math.max(3,Math.min(100,Number(p.predicted_score)))}%"></div><span class="bar-label">${i+1}</span></div>`).join("");
  }
  function extractSkills(text) {
    const normalized = text.toLowerCase();
    const all = [...new Set(Object.values(roleSkills).flat().concat(["javascript","html","css","react","java","c++","communication","git","github","flask","docker","aws","tensorflow","pytorch","opencv","data structures","algorithms"]))];
    return all.filter(skill => new RegExp(`(^|[^a-z0-9+#])${skill.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z0-9+#]|$)`,"i").test(normalized));
  }
  function extractSections(text) {
    const t = text.toLowerCase();
    const rules = {education:/education|bachelor|b\.tech|degree|university|college|diploma/,projects:/projects|project experience/,experience:/experience|internship|employment/,certifications:/certification|certified|certificate/};
    return Object.entries(rules).filter(([_,re])=>re.test(t)).map(([name])=>name);
  }
  async function analyzePdf(file, target) {
    if(file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Please choose a PDF file.");
    if(file.size > 5*1024*1024) throw new Error("PDF must be 5 MB or smaller.");
    // This starter uses pdf.js loaded from CDN to read text locally; no file is uploaded to a server.
    if(!window.pdfjsLib) throw new Error("PDF text reader did not load. Check internet connection and retry.");
    const bytes = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({data:bytes}).promise;
    let text = "";
    for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text += " "+content.items.map(x=>x.str).join(" ");}
    if(text.trim().length < 30) throw new Error("This PDF contains little or no selectable text. Scanned PDFs need OCR, which is not included in this starter.");
    const skills=extractSkills(text), sections=extractSections(text), required=roleSkills[target]||[];
    const matched=required.filter(s=>skills.includes(s)), missing=required.filter(s=>!skills.includes(s));
    const coverage=Math.round(required.length ? matched.length/required.length*100 : 0);
    const suggestions=[];
    if(!sections.includes("education")) suggestions.push("Add a clearly labelled Education section.");
    if(!sections.includes("projects")) suggestions.push("Include 2–3 projects with technologies and measurable outcomes.");
    if(!sections.includes("experience")) suggestions.push("Add internship, volunteering, or relevant practical experience if available.");
    if(!sections.includes("certifications")) suggestions.push("Include relevant certifications or coursework if you have them.");
    if(missing.length) suggestions.push("Build small projects or practice exercises using the missing target-role skills.");
    if(!suggestions.length) suggestions.push("Tailor bullet points to the target role and quantify project outcomes.");
    return {fileName:file.name,skills,sections,matched,missing,coverage,target,suggestions,extractedText:text.slice(0,12000)};
  }
  function renderResume(r) {
    $("#resumeResult").innerHTML=`<div class="result-symbol purple-symbol">▤</div><span class="eyebrow">SKILL COVERAGE · ${escapeHtml(r.target)}</span><div class="result-score">${r.coverage}%</div><p>${r.matched.length} of ${(roleSkills[r.target]||[]).length} required skills detected in selectable PDF text.</p><h3>Detected skills</h3><div class="skill-tags">${r.skills.length?r.skills.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join(""):'<span class="skill-tag missing">No known skills detected</span>'}</div><h3>Missing target skills</h3><div class="skill-tags">${r.missing.length?r.missing.map(s=>`<span class="skill-tag missing">${escapeHtml(s)}</span>`).join(""):'<span class="skill-tag">All listed requirements detected</span>'}</div><h3>Sections detected</h3><div class="skill-tags">${r.sections.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join("")||"No common section headings detected"}</div><h3>Suggestions</h3><ul class="suggestions">${r.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul><p>Resume file analyzed locally in this browser; this starter does not upload or persist the PDF.</p>`;
    $("#statSkills").textContent=r.coverage+"%"; renderJobs();
  }
  async function onResume(e) {
    e.preventDefault(); const file=$("#resumeFile").files[0]; if(!file) return toast("Choose a PDF resume first.",true);
    const box=$("#resumeResult"); box.innerHTML='<div class="result-empty"><strong>Analyzing PDF…</strong><p>Reading text locally in your browser.</p></div>';
    try { state.resume=await analyzePdf(file,$("#targetRole").value); renderResume(state.resume); toast("Resume analysis completed."); }
    catch(err){box.innerHTML=`<div class="result-empty"><div class="result-symbol purple-symbol">!</div><strong>Could not analyze PDF</strong><p>${escapeHtml(err.message)}</p></div>`;toast(err.message,true);}
  }
  function renderJobs() {
    const grid=$("#jobsGrid"); const skills=state.resume?.skills||[];
    if(!state.resume){grid.innerHTML='<div class="panel empty-state">Analyze a resume first to calculate personalized job matches.</div>';return;}
    grid.innerHTML=jobs.map((j,index)=>{
      const matched=j.required.filter(s=>skills.includes(s)), missing=j.required.filter(s=>!skills.includes(s));
      const score=Math.round(matched.length/j.required.length*100);
      return `<article class="job-card"><div class="job-card-top"><div><h3>${escapeHtml(j.title)}</h3><p>${escapeHtml(j.level)} · ${escapeHtml(j.location)}</p></div><span class="match-score">${score}% match</span></div><p>${escapeHtml(j.description)}</p><small>Matched skills</small><div class="skill-tags">${matched.length?matched.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join(""):'<span class="skill-tag missing">No listed skills yet</span>'}</div><small>Skills to develop</small><div class="skill-tags">${missing.map(s=>`<span class="skill-tag missing">${escapeHtml(s)}</span>`).join("")||'<span class="skill-tag">No gaps detected</span>'}</div><button class="btn btn-outline" data-job="${index}">View job description →</button><div class="job-detail" id="jobdetail-${index}"><strong>Suggested projects</strong><ul class="suggestions">${j.projects.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul><strong>Learning topics</strong><ul class="suggestions">${j.learning.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul><p>Preferred skills: ${escapeHtml(j.preferred.join(", "))}</p></div></article>`;
    }).sort((a,b)=>{const getScore=x=>Number((x.match(/class="match-score">(\d+)%/)||[])[1]||0);return getScore(b)-getScore(a)}).join("");
    $$("[data-job]",grid).forEach(btn=>btn.addEventListener("click",()=>$("#jobdetail-"+btn.dataset.job).classList.toggle("open")));
  }
  async function loadResumeSummary() {
    // Resume text is deliberately not stored by this starter. This function is a placeholder for
    // loading a non-sensitive saved summary if a future backend schema is added.
  }
  function wireForms() {
    $("#authForm").addEventListener("submit", submitAuth);
    $("#showLogin").addEventListener("click", () => setAuthMode("login"));
    $("#showRegister").addEventListener("click", () => setAuthMode("register"));
    $("#authClose").addEventListener("click", closeAuthModal);
    $("#authModal").addEventListener("click", e => { if (e.target === $("#authModal")) closeAuthModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeAuthModal(); });
    $("#predictionForm").addEventListener("submit",onPrediction);
    $("#resumeForm").addEventListener("submit",onResume);
    $("#resumeFile").addEventListener("change",e=>$("#fileName").textContent=e.target.files[0]?.name||"No file selected");
    $("#refreshHistory").addEventListener("click",loadHistory);
    $("#settingsForm").addEventListener("submit",async e=>{
      e.preventDefault();const url=$("#supabaseUrl").value.trim(),key=$("#supabaseKey").value.trim();
      if((url&&!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url))){toast("Enter a valid Supabase project URL.",true);return;}
      if(!url||!key){localStorage.removeItem("studentai_supabase_url");localStorage.removeItem("studentai_supabase_key");state.supabase=null;state.user=null;updateConnectionBadge(false);toast("Connection settings cleared.");return;}
      localStorage.setItem("studentai_supabase_url",url);localStorage.setItem("studentai_supabase_key",key);await initSupabase();
    });
  }
  function addPdfJs() {
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload=()=>{if(window.pdfjsLib)window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";};
    script.onerror=()=>toast("PDF reader could not load. Check your internet connection.",true);
    document.head.appendChild(script);
  }
  async function init() {wireNavigation();wireForms();addPdfJs();navigate("dashboard");await initSupabase();}
  document.addEventListener("DOMContentLoaded",init);
})();
