(() => {
  const cfg=window.APP_CONFIG||{};
  const configured=cfg.SUPABASE_URL?.startsWith("https://") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("SEU-PROJETO");
  const db=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
  const $=id=>document.getElementById(id);
  let rows=[], currentImages=[];
  const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
  const toast=m=>{const e=$("toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),3200);};
  const message=(id,text)=>$(id).textContent=text;

  async function init(){
    if(!db){message("loginMessage","Configure a URL e a chave pública do Supabase em config.js.");return;}
    const {data:{session}}=await db.auth.getSession();
    if(session) showDashboard();
    db.auth.onAuthStateChange((_event,session)=>{if(session)showDashboard();else showLogin();});
  }
  function showLogin(){$("loginPanel").classList.remove("hidden");$("dashboard").classList.add("hidden");}
  async function showDashboard(){$("loginPanel").classList.add("hidden");$("dashboard").classList.remove("hidden");await loadRows();}
  $("loginForm").addEventListener("submit",async e=>{e.preventDefault();message("loginMessage","Entrando...");const {error}=await db.auth.signInWithPassword({email:$("loginEmail").value,password:$("loginPassword").value});message("loginMessage",error?error.message:"");});
  async function loadRows(){
    const {data,error}=await db.from("properties").select("*").order("created_at",{ascending:false});
    if(error){toast("Erro ao carregar imóveis: "+error.message);return;}
    rows=data||[];$("totalCount").textContent=rows.length;$("publishedCount").textContent=rows.filter(x=>x.status==="published").length;$("draftCount").textContent=rows.filter(x=>x.status==="draft").length;renderRows();
  }
  function renderRows(){
    const term=$("adminSearch").value.toLowerCase();
    const filtered=rows.filter(p=>[p.title,p.neighborhood,p.city].join(" ").toLowerCase().includes(term));
    $("adminRows").innerHTML=filtered.length?filtered.map(p=>`<tr><td><strong>${escapeHTML(p.title)}</strong><small>${escapeHTML([p.neighborhood,p.city].filter(Boolean).join(", "))}</small></td><td>${escapeHTML(p.purpose)}</td><td>${money(p.price)}</td><td><span class="status-pill ${p.status}">${p.status==="published"?"Publicado":p.status==="draft"?"Rascunho":"Vendido / Alugado"}</span></td><td><div class="table-actions"><button data-edit="${p.id}">Editar</button><button class="delete-action" data-delete="${p.id}">Excluir</button></div></td></tr>`).join(""):'<tr><td colspan="5">Nenhum imóvel cadastrado.</td></tr>';
    $("adminRows").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openEditor(rows.find(p=>p.id===b.dataset.edit))));
    $("adminRows").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProperty(b.dataset.delete)));
  }
  $("adminSearch").addEventListener("input",renderRows);
  $("newPropertyBtn").addEventListener("click",()=>openEditor());
  function openEditor(p){
    $("propertyForm").reset();$("propertyId").value=p?.id||"";currentImages=p?.images?[...p.images]:[];
    $("editorTitle").textContent=p?"Editar imóvel":"Novo imóvel";
    const fields={title:"title",propertyType:"property_type",purpose:"purpose",price:"price",status:"status",bedrooms:"bedrooms",bathrooms:"bathrooms",parking:"parking",area:"area",condoFee:"condo_fee",propertyTax:"property_tax",address:"address",neighborhood:"neighborhood",city:"city",state:"state",description:"description"};
    if(p)Object.entries(fields).forEach(([id,key])=>$(id).value=p[key]??"");
    renderExistingImages();message("editorMessage","");$("editorModal").classList.remove("hidden");document.body.classList.add("modal-open");
  }
  function renderExistingImages(){
    $("existingImages").innerHTML=currentImages.map((url,i)=>`<div class="existing-image"><img src="${escapeHTML(url)}" alt="Foto ${i+1}"><button type="button" data-remove-image="${i}" aria-label="Remover foto">×</button></div>`).join("");
    $("existingImages").querySelectorAll("[data-remove-image]").forEach(b=>b.addEventListener("click",()=>{currentImages.splice(Number(b.dataset.removeImage),1);renderExistingImages();}));
  }
  function closeEditor(){$("editorModal").classList.add("hidden");document.body.classList.remove("modal-open");}
  document.querySelectorAll("[data-close-editor]").forEach(b=>b.addEventListener("click",closeEditor));
  async function uploadImages(files){
    const urls=[];
    for(const file of files){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Formato inválido. Use JPG, PNG ou WEBP.");
      if(file.size>5*1024*1024)throw new Error(`A imagem ${file.name} excede 5 MB.`);
      const safeName=file.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"-");
      const path=`${crypto.randomUUID()}-${safeName}`;
      const {error}=await db.storage.from("property-images").upload(path,file,{cacheControl:"3600",upsert:false});
      if(error)throw error;
      const {data}=db.storage.from("property-images").getPublicUrl(path);urls.push(data.publicUrl);
    }
    return urls;
  }
  $("propertyForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=$("savePropertyBtn");btn.disabled=true;btn.textContent="Salvando...";message("editorMessage","Salvando informações e imagens...");
    try{
      const number=id=>$(id).value===""?null:Number($(id).value);
      const payload={title:$("title").value.trim(),property_type:$("propertyType").value,purpose:$("purpose").value,price:Number($("price").value),status:$("status").value,bedrooms:number("bedrooms")??0,bathrooms:number("bathrooms")??0,parking:number("parking")??0,area:number("area"),condo_fee:number("condoFee"),property_tax:number("propertyTax"),address:$("address").value.trim()||null,neighborhood:$("neighborhood").value.trim()||null,city:$("city").value.trim()||null,state:$("state").value.trim().toUpperCase()||null,description:$("description").value.trim()||null,images:[...currentImages,...await uploadImages([...$("images").files])]};
      const id=$("propertyId").value;
      const result=id?await db.from("properties").update(payload).eq("id",id):await db.from("properties").insert(payload);
      if(result.error)throw result.error;
      closeEditor();toast(id?"Imóvel atualizado com sucesso.":"Imóvel cadastrado com sucesso.");await loadRows();
    }catch(err){message("editorMessage",err.message||"Não foi possível salvar.");}
    finally{btn.disabled=false;btn.textContent="Salvar imóvel";}
  });
  async function deleteProperty(id){
    const p=rows.find(x=>x.id===id);if(!p||!confirm(`Excluir "${p.title}"? Esta ação não pode ser desfeita.`))return;
    const {error}=await db.from("properties").delete().eq("id",id);
    if(error){toast("Não foi possível excluir: "+error.message);return;}
    toast("Imóvel excluído.");await loadRows();
  }
  init();
})();
