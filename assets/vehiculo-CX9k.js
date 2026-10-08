document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('id');

    if (!carId) {
        document.getElementById('carDetailContainer').innerHTML = '<h2 style="color:white; text-align:center;">Vehículo no encontrado</h2>';
        return;
    }

    let car = null;

    try {
        const res = await fetch('/api/vehicles/' + carId);
        if (res.ok) {
            const json = await res.json();
            const vDataRaw = json.data;
            if (vDataRaw) {
                car = { ...vDataRaw, bodyType: vDataRaw.bodyType || vDataRaw.body_type };
            }
        }
    } catch (e) {
        console.warn('Error fetching car:', e);
    }

    if (!car) {
        document.getElementById('carDetailContainer').innerHTML = `
            <div style="padding: 80px 20px; text-align: center; max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <i class="fas fa-car" style="font-size: 3rem; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h2 style="color: #0f172a; font-family: var(--font-display, sans-serif); font-size: 1.5rem; margin-bottom: 12px;">Vehículo No Disponible</h2>
                <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">Este vehículo ha sido vendido o retirado de nuestro inventario oficial.</p>
                <a href="/catalogo" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                    <i class="fas fa-arrow-left"></i> Explorar Catálogo Disponible
                </a>
            </div>
        `;
        return;
    }

    // Dynamic SEO update for specific vehicle
    try {
        if (car.title) {
            document.title = `${car.title} | Semi Nuevo Autos Venezuela`;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                const descText = `${car.title} en venta en Venezuela. Año ${car.year || ''}, ${car.km || '0 km'}, motor ${car.engine || ''}. Certificación e inspección MasterTech.`.substring(0, 155);
                metaDesc.setAttribute('content', descText);
            }
            const canonicalEl = document.querySelector('link[rel="canonical"]');
            if (canonicalEl) {
                canonicalEl.setAttribute('href', `https://seminuevoautos.com/vehiculo?id=${car.id}`);
            }
        }
    } catch(e) {}

    window.currentCarImages = car.images || [];
    window.currentImageIndex = 0;

    const fallbackBodyType = (typeof BODY_TYPE_LABELS !== 'undefined' && BODY_TYPE_LABELS[car.bodyType]) ? BODY_TYPE_LABELS[car.bodyType] : car.bodyType || 'Vehículo';
    const fallbackOrigin = (typeof ORIGIN_LABELS !== 'undefined' && ORIGIN_LABELS[car.origin]) ? ORIGIN_LABELS[car.origin] : car.origin || 'N/A';
    
    // Configs
    let whatsappNumber = "584248700438";
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data: sData } = await supabaseClient.from('site_settings').select('value').eq('key', 'whatsapp_number').maybeSingle();
            if (sData && sData.value) {
                whatsappNumber = String(JSON.parse(sData.value)).replace(/[^0-9]/g, '');
            }
        }
    } catch (e) {}

    const priceText = car.price === 'Consultar' ? 'Consultar precio' : car.price;
    const cleanDesc = car.description ? car.description.split('\n\n[ADMIN-LINK]:')[0] : '';
    
    // Photos
    let imagesHtml = '';
    if (car.images && car.images.length > 0) {
        imagesHtml = `
            <div class="vehicle-page-gallery" style="margin-bottom: 30px;">
                <div id="mainVehicleImageContainer" onclick="openVehicleLightbox(window.currentImageIndex)" style="width: 100%; height: clamp(280px, 52vw, 620px); min-height: 280px; max-height: 620px; border-radius: var(--radius-lg); background: #080808; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; border: 1px solid var(--ghost-border); cursor: zoom-in; transition: transform 0.3s ease;">
                    <div id="mainVehicleBgBlur" style="position: absolute; inset: 0; background-image: url('${car.images[0]}'); background-size: cover; background-position: center; filter: blur(40px) brightness(0.3); opacity: 0.85; transform: scale(1.15);"></div>
                    <img id="mainVehicleImage" src="${car.images[0]}" style="position: relative; z-index: 2; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; transition: opacity 0.3s; box-shadow: 0 12px 45px rgba(0,0,0,0.7);" alt="${car.title}">
                    <div style="position: absolute; bottom: 15px; right: 15px; z-index: 10; background: rgba(10,10,10,0.75); backdrop-filter: blur(12px); padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid rgba(255,255,255,0.18); color: #fff; font-size: 0.82rem; font-weight: 500; pointer-events: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                        <i class="fas fa-expand-alt" style="color: var(--primary);"></i> Ver pantalla completa
                    </div>
                </div>
                <div class="vehicle-thumbnails" style="display: flex; gap: 12px; margin-top: 15px; overflow-x: auto; padding-bottom: 10px;">
                    ${car.images.map((img, i) => `<img src="${img}" class="v-thumb" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" style="width: 110px; height: 80px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer; opacity: ${i===0?'1':'0.5'}; border: 2px solid ${i===0?'var(--primary)':'transparent'}; transition: 0.3s;" onclick="changeMainVehicleImage('${img}', ${i}, this)">`).join('')}
                </div>
            </div>
        `;
    }

    const availBadgeHtml = (car.availability === 'entrega_inmediata')
        ? `<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 100px; background: rgba(37, 211, 102, 0.15); color: #4ade80; border: 1px solid rgba(37, 211, 102, 0.3); font-size: 0.8rem; font-weight: 700; font-family: system-ui, -apple-system, sans-serif; letter-spacing: 0.5px;"><i class="fas fa-bolt"></i> EN STOCK (ENTREGA INMEDIATA)</span>`
        : `<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 100px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.8rem; font-weight: 700; font-family: system-ui, -apple-system, sans-serif; letter-spacing: 0.5px;"><i class="fas fa-clock"></i> POR PEDIDO</span>`;

    const originFormatted = car.origin ? (car.origin === 'nacional' ? 'Nacional' : 'Puerto Libre / Importado') : (car.badge || 'Puerto Libre');

    const html = `
        <div class="vehicle-grid-container" style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: start;">
            <div class="vehicle-page-left">
                ${imagesHtml}
            </div>
            <div class="vehicle-page-right" style="background: var(--surface-container); padding: 32px; border-radius: var(--radius-lg); border: 1px solid var(--ghost-border);">
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; align-items: center;">
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 100px; background: #F1F3F5; color: #1F2937; border: 1px solid #D1D5DB; font-size: 0.8rem; font-weight: 700; font-family: system-ui, -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-car-side"></i> ${fallbackBodyType}</span>
                    ${availBadgeHtml}
                </div>
                <h1 style="font-family: var(--font-display); font-size: 2.3rem; margin-bottom: 10px; line-height: 1.2;">${car.title}</h1>
                <p style="font-size: 1.9rem; font-weight: bold; color: var(--primary); margin-bottom: 25px;">${priceText}</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 14px; border-radius: var(--radius-sm);">
                        <i class="fas fa-calendar" style="color: var(--primary);"></i> <span>Año: <strong>${car.year}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 14px; border-radius: var(--radius-sm);">
                        <i class="fas fa-road" style="color: var(--primary);"></i> <span>Recorrido: <strong>${car.km}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 14px; border-radius: var(--radius-sm);">
                        <i class="fas fa-engine" style="color: var(--primary);"></i> <span>Motor: <strong>${car.engine || 'N/A'}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 14px; border-radius: var(--radius-sm);">
                        <i class="fas fa-gear" style="color: var(--primary);"></i> <span>Transmisión: <strong>${car.transmission || 'Automático'}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 14px; border-radius: var(--radius-sm);">
                        <i class="fas fa-gas-pump" style="color: var(--primary);"></i> <span>Combustible: <strong>${car.fuel || 'Gasolina'}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 14px; border-radius: var(--radius-sm);">
                        <i class="fas fa-globe" style="color: var(--primary);"></i> <span>Origen: <strong>${originFormatted}</strong></span>
                    </div>
                    ${(() => {
                        let displayVin = car.vin || '';
                        if (!displayVin && car.description) {
                            const vm = car.description.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i) || car.description.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
                            if (vm) displayVin = vm[1].toUpperCase();
                        }
                        return displayVin ? `
                        <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: #F8F9FA; border: 1px solid #E5E7EB; padding: 12px 16px; border-radius: var(--radius-sm);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-barcode" style="color: var(--primary); font-size: 1.15rem;"></i>
                                <span>Serial / VIN: <strong style="font-family: monospace; letter-spacing: 1px; color: #111827; font-size: 0.95rem;">${displayVin}</strong></span>
                            </div>
                            <span style="font-size: 0.75rem; color: #15803D; font-weight: 600; background: #DCFCE7; padding: 3px 8px; border-radius: 4px; border: 1px solid #BBF7D0;">
                                <i class="fas fa-check-circle"></i> Verificado
                            </span>
                        </div>` : '';
                    })()}
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 1.25rem; margin-bottom: 12px; font-family: var(--font-display);">Descripción del Vehículo</h3>
                    <p style="color: var(--on-surface-variant); line-height: 1.7; white-space: pre-line; font-size: 0.98rem;">${cleanDesc || 'Sin descripción detallada.'}</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, estoy interesado en la ${car.title} año ${car.year} (${car.price}) vista en la página web.`)}" target="_blank" class="btn btn-whatsapp btn-block" style="padding: 16px; font-size: 1.05rem; justify-content: center; font-weight: 700;">
                        <i class="fab fa-whatsapp"></i> COTIZA TU VEHÍCULO
                    </a>
                    <button class="btn btn-outline btn-block" onclick="navigator.clipboard.writeText(window.location.href); alert('Enlace copiado al portapapeles');" style="padding: 14px; font-size: 0.9rem; justify-content: center;">
                        <i class="fas fa-share-alt"></i> COMPARTIR VEHÍCULO
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('carDetailContainer').innerHTML = html;
    
    // Override container width for this specific page
    const container = document.getElementById('carDetailContainer');
    if (container) {
        container.style.maxWidth = '1400px';
        container.style.width = '95%';
    }

    // Make responsive using JS
    const applyLayout = () => {
        const grid = document.querySelector('.vehicle-grid-container');
        const imgContainer = document.getElementById('mainVehicleImageContainer');
        if (!grid) return;
        if (window.innerWidth <= 900) {
            grid.style.gridTemplateColumns = '1fr';
            if (imgContainer) imgContainer.style.height = '380px';
        } else if (window.innerWidth <= 1200) {
            grid.style.gridTemplateColumns = '1fr 1fr';
            if (imgContainer) imgContainer.style.height = '520px';
        } else {
            grid.style.gridTemplateColumns = '1.15fr 0.85fr';
            if (imgContainer) imgContainer.style.height = '620px';
        }
    };
    applyLayout();
    window.addEventListener('resize', applyLayout);
});


window.changeMainVehicleImage = function(src, index, thumbElement) {
    window.currentImageIndex = index;
    const mainImg = document.getElementById('mainVehicleImage');
    const mainBg = document.getElementById('mainVehicleBgBlur');
    if (mainImg) {
        mainImg.style.opacity = '0.3';
        mainImg.onload = function() {
            mainImg.style.opacity = '1';
        };
        mainImg.src = src;
    }
    if (mainBg) {
        mainBg.style.backgroundImage = `url('${src}')`;
    }
    
    document.querySelectorAll('.v-thumb').forEach((t, idx) => {
        t.style.opacity = idx === index ? '1' : '0.5';
        t.style.borderColor = idx === index ? 'var(--primary)' : 'transparent';
    });
};

// Fullscreen Lightbox Modal
window.openVehicleLightbox = function(index) {
    const images = window.currentCarImages || [];
    if (!images || images.length === 0) return;
    
    window.currentImageIndex = index || 0;
    
    let modal = document.getElementById('vehicleLightboxModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vehicleLightboxModal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.95); backdrop-filter:blur(25px); display:flex; align-items:center; justify-content:center; flex-direction:column;';
        modal.innerHTML = `
            <button onclick="closeVehicleLightbox()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:1.5rem; width:50px; height:50px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10001; transition:0.3s;"><i class="fas fa-times"></i></button>
            <button onclick="navVehicleLightbox(-1)" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:1.5rem; width:54px; height:54px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10001; transition:0.3s;"><i class="fas fa-chevron-left"></i></button>
            <button onclick="navVehicleLightbox(1)" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:1.5rem; width:54px; height:54px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10001; transition:0.3s;"><i class="fas fa-chevron-right"></i></button>
            <div style="max-width:92vw; max-height:86vh; display:flex; align-items:center; justify-content:center;">
                <img id="lightboxImg" src="" style="max-width:92vw; max-height:86vh; object-fit:contain; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.9); transition: opacity 0.25s ease;" alt="Vehículo">
            </div>
            <div id="lightboxCounter" style="color:rgba(255,255,255,0.7); font-size:0.9rem; margin-top:16px; font-family:var(--font-display); letter-spacing:2px;"></div>
        `;
        document.body.appendChild(modal);
        
        document.addEventListener('keydown', (e) => {
            if (modal.style.display !== 'flex') return;
            if (e.key === 'Escape') closeVehicleLightbox();
            if (e.key === 'ArrowLeft') navVehicleLightbox(-1);
            if (e.key === 'ArrowRight') navVehicleLightbox(1);
        });
    }
    
    updateLightboxContent();
    modal.style.display = 'flex';
};

window.closeVehicleLightbox = function() {
    const modal = document.getElementById('vehicleLightboxModal');
    if (modal) modal.style.display = 'none';
};

window.navVehicleLightbox = function(dir) {
    const images = window.currentCarImages || [];
    if (!images || images.length === 0) return;
    
    window.currentImageIndex = (window.currentImageIndex + dir + images.length) % images.length;
    updateLightboxContent();
};

function updateLightboxContent() {
    const images = window.currentCarImages || [];
    const idx = window.currentImageIndex || 0;
    const imgEl = document.getElementById('lightboxImg');
    const counterEl = document.getElementById('lightboxCounter');
    
    if (imgEl && images[idx]) {
        imgEl.style.opacity = '0.4';
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        imgEl.src = images[idx];
    }
    if (counterEl) {
        counterEl.textContent = `${idx + 1} / ${images.length}`;
    }
}
