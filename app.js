(() => {
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.SUPABASE_URL?.startsWith("https://") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("SEU-PROJETO");
  const client = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const grid = document.getElementById("propertyGrid");
  const empty = document.getElementById("emptyState");
  let properties = [];

  const money = (value, purpose) => {
    const formatted = Number(value || 0).toLocaleString("pt-BR", {style:"currency",currency:"BRL",maximumFractionDigits:0});
    return `${formatted}${purpose === "Aluguel" ? " / mês" : ""}`;
  };
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const photo = p => p.images?.[0] || "";
  const toast = message => { const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3200); };
  const contactUrl = (message) => `https://wa.me/${(cfg.CONTACT_WHATSAPP || "").replace(/\D/g,"")}?text=${encodeURIComponent(message)}`;

  async function loadProperties() {
    if (!client) {
      grid.innerHTML = '<div class="setup-notice"><strong>Configuração necessária</strong><p>Adicione a URL e a chave pública do Supabase no arquivo <code>config.js</code> e recarregue a página.</p></div>';
      document.getElementById("resultsCount").textContent = "Portal em configuração";
      return;
    }
    const { data, error } = await client.from("properties").select("*").eq("status","published").order("created_at",{ascending:false});
    if (error) { grid.innerHTML = '<div class="setup-notice">Não foi possível carregar os imóveis. Verifique a configuração do Supabase e as políticas de acesso.</div>'; return; }
    properties = data || [];
    renderProperties();
  }

  function renderProperties() {
    const term = document.getElementById("searchInput").value.trim().toLowerCase();
    const type = document.getElementById("typeFilter").value;
    const purpose = document.getElementById("purposeFilter").value;
    const filtered = properties.filter(p => {
      const text = [p.title,p.neighborhood,p.city,p.description,p.address].join(" ").toLowerCase();
      return (!term || text.includes(term)) && (!type || p.property_type === type) && (!purpose || p.purpose === purpose);
    });
    document.getElementById("resultsCount").textContent = `${filtered.length} ${filtered.length === 1 ? "imóvel disponível" : "imóveis disponíveis"}`;
    grid.innerHTML = "";
    empty.classList.toggle("hidden", filtered.length !== 0);
    if (!filtered.length) return;
    filtered.forEach(p => {
      const card = document.createElement("article");
      card.className = "property-card";
      const img = photo(p);
      card.innerHTML = `
        <button class="property-image" aria-label="Ver ${escapeHTML(p.title)}" style="${img ? `background-image:url('${escapeHTML(img)}')` : ""}">
          ${!img ? '<span class="image-placeholder">⌂</span>' : ""}
          <span class="property-tag">${escapeHTML(p.purpose)}</span>
        </button>
        <div class="property-info"><span class="property-type">${escapeHTML(p.property_type)}</span>
          <h3>${escapeHTML(p.title)}</h3><p class="property-location">⌖ ${escapeHTML([p.neighborhood,p.city].filter(Boolean).join(", ") || "Consulte a localização")}</p>
          <strong class="property-price">${money(p.price,p.purpose)}</strong>
          <div class="property-card-footer"><span>${p.area ? `${Number(p.area)} m²` : "Área não informada"}</span><span>${Number(p.bedrooms||0)} quartos</span><span>${Number(p.parking||0)} vagas</span></div>
          <button class="card-link">Conhecer imóvel <span>↗</span></button>
        </div>`;
      card.querySelector(".property-image").addEventListener("click",()=>openDetails(p));
      card.querySelector(".card-link").addEventListener("click",()=>openDetails(p));
      grid.appendChild(card);
    });
  }

  function openDetails(p) {
    const images = p.images || [];
    document.getElementById("modalGallery").innerHTML = images.length ? images.map(url=>`<img src="${escapeHTML(url)}" alt="${escapeHTML(p.title)}">`).join("") : '<div class="image-placeholder">⌂</div>';
    document.getElementById("modalMeta").textContent = `${p.purpose} · ${p.property_type}`;
    document.getElementById("modalTitle").textContent = p.title;
    document.getElementById("modalLocation").textContent = [p.address,p.neighborhood,p.city,p.state].filter(Boolean).join(", ");
    document.getElementById("modalPrice").textContent = money(p.price,p.purpose);
    document.getElementById("modalFeatures").innerHTML = [
      ["⌂",p.area ? `${p.area} m²` : "Área não informada"],["▤",`${p.bedrooms||0} quartos`],["◫",`${p.bathrooms||0} banheiros`],["▱",`${p.parking||0} vagas`]
    ].map(([i,t])=>`<span>${i} ${escapeHTML(t)}</span>`).join("");
    document.getElementById("modalDescription").textContent = p.description || "Entre em contato para saber mais detalhes sobre este imóvel.";
    const cta=document.getElementById("modalContact");
    cta.href=contactUrl(`Olá! Tenho interesse no imóvel: ${p.title} (${money(p.price,p.purpose)}).`);
    cta.style.display=(cfg.CONTACT_WHATSAPP || "").replace(/\D/g,"").length >= 10 ? "inline-flex" : "none";
    document.getElementById("propertyModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  document.querySelectorAll("[data-close-modal]").forEach(el=>el.addEventListener("click",closeModal));
  function closeModal(){document.getElementById("propertyModal").classList.add("hidden");document.body.classList.remove("modal-open");}
  ["searchInput","typeFilter","purposeFilter"].forEach(id=>document.getElementById(id).addEventListener(id==="searchInput"?"input":"change",renderProperties));
  document.getElementById("clearFilters").addEventListener("click",()=>{document.getElementById("searchInput").value="";document.getElementById("typeFilter").value="";document.getElementById("purposeFilter").value="";renderProperties();});
  document.getElementById("contactLink").href = (cfg.CONTACT_WHATSAPP || "").replace(/\D/g,"").length >= 10 ? contactUrl("Olá! Gostaria de mais informações sobre os imóveis.") : "#imoveis";
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("menuToggle").addEventListener("click",()=>document.querySelector(".main-nav").classList.toggle("nav-open"));
  loadProperties();
})();
