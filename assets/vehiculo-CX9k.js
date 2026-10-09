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
            <div class="vehicle-page-gallery">
                <div id="mainVehicleImageContainer" class="main-vehicle-stage" style="position:relative; width:100%; height:480px; max-height:480px; overflow:hidden; border-radius:20px; display:flex; align-items:center; justify-content:center; background:#030712;" onclick="openVehicleLightbox(window.currentImageIndex)">
                    <div id="mainVehicleBgBlur" class="stage-bg-blur" style="background-image: url('${car.images[0]}'); position:absolute; inset:0; background-size:cover; background-position:center; filter:blur(45px) brightness(0.25); transform:scale(1.15); opacity:0.9; pointer-events:none;"></div>
                    <img id="mainVehicleImage" class="stage-main-img" src="${car.images[0]}" alt="${car.title}" style="position:relative; z-index:2; max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain;">
                    <img src="images/logo-mastertech.png" class="badge-stage-seal" alt="MasterTech Verified" onerror="this.style.display='none'">
                    <div class="badge-stage-fullscreen">
                        <i class="fas fa-expand-alt" style="color: #38bdf8;"></i> Pantalla Completa
                    </div>
                </div>
                ${car.images.length > 1 ? `
                <div class="vehicle-thumbs-reel">
                    ${car.images.map((img, i) => `
                        <img src="${img}" class="v-thumb-img ${i === 0 ? 'active' : ''}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" alt="Vista ${i + 1}" onclick="changeMainVehicleImage('${img}', ${i}, this)">
                    `).join('')}
                </div>` : ''}
            </div>
            <div class="mastertech-assurance-box">
                <div class="assurance-icon">
                    <i class="fas fa-shield-halved"></i>
                </div>
                <div class="assurance-text">
                    <h4>Inspección 150 Puntos &amp; Garantía MasterTech</h4>
                    <p>Cada vehículo pasa por un diagnóstico computarizado exhaustivo en nuestro taller aliado MasterTech Center. Incluye 2 años de revisiones periódicas sin costo de mano de obra.</p>
                </div>
            </div>
        `;
    }

    const availBadgeHtml = (car.availability === 'entrega_inmediata')
        ? `<span class="c-badge c-badge-status"><i class="fas fa-bolt"></i> En Stock (Entrega Inmediata)</span>`
        : `<span class="c-badge c-badge-order"><i class="fas fa-clock"></i> Por Pedido</span>`;

    const originFormatted = car.origin ? (car.origin === 'nacional' ? 'Nacional' : 'Puerto Libre / Importado') : (car.badge || 'Puerto Libre');

    let displayVin = car.vin || '';
    if (!displayVin && car.description) {
        const vm = car.description.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i) || car.description.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
        if (vm) displayVin = vm[1].toUpperCase();
    }

    const html = `
        <div class="vehicle-breadcrumb-bar">
            <a href="catalogo" class="btn-back-catalog">
                <i class="fas fa-arrow-left"></i> Volver al Catálogo
            </a>
            <div class="breadcrumb-trail">
                <a href="/" style="color:#64748b; text-decoration:none;">Inicio</a>
                <i class="fas fa-chevron-right" style="font-size:0.65rem;"></i>
                <a href="catalogo" style="color:#64748b; text-decoration:none;">Inventario</a>
                <i class="fas fa-chevron-right" style="font-size:0.65rem;"></i>
                <span class="active-crumb">${car.title}</span>
            </div>
        </div>

        <div class="vehicle-grid-container">
            <div class="vehicle-page-left">
                ${imagesHtml}
            </div>
            <div class="vehicle-page-right">
                <div class="vehicle-commercial-card">
                    <div class="commercial-badges-row">
                        <span class="c-badge c-badge-type"><i class="fas fa-car-side"></i> ${fallbackBodyType}</span>
                        <span class="c-badge c-badge-type"><i class="fas fa-globe"></i> ${originFormatted}</span>
                        ${availBadgeHtml}
                    </div>
                    <h1 class="vehicle-title-h1">${car.title}</h1>
                    <div class="vehicle-price-highlight">${priceText}</div>
                    <div class="price-sub-note">Impuestos y gastos de gestión incluidos • Transacción 100% transparente</div>

                    <div class="financing-hook-box">
                        <span><i class="fas fa-calculator" style="color: #60a5fa; margin-right: 6px;"></i> Plan de Financiamiento desde <strong>30% inicial</strong></span>
                        <a href="calculadora" class="btn-calc-mini">Simular Cuota</a>
                    </div>

                    <div class="specs-dashboard-grid">
                        <div class="spec-dash-cell">
                            <i class="fas fa-calendar spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Año</span>
                                <span class="spec-dash-value">${car.year || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="spec-dash-cell">
                            <i class="fas fa-road spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Kilometraje</span>
                                <span class="spec-dash-value">${car.km || '0 km'}</span>
                            </div>
                        </div>
                        <div class="spec-dash-cell">
                            <i class="fas fa-gear spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Transmisión</span>
                                <span class="spec-dash-value">${car.transmission || 'Automático'}</span>
                            </div>
                        </div>
                        <div class="spec-dash-cell">
                            <i class="fas fa-gauge-high spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Motor</span>
                                <span class="spec-dash-value">${car.engine || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="spec-dash-cell">
                            <i class="fas fa-gas-pump spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Combustible</span>
                                <span class="spec-dash-value">${car.fuel || 'Gasolina'}</span>
                            </div>
                        </div>
                        <div class="spec-dash-cell">
                            <i class="fas fa-shield-halved spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Estatus Legal</span>
                                <span class="spec-dash-value">100% Verificado</span>
                            </div>
                        </div>
                        ${displayVin ? `
                        <div class="spec-vin-full">
                            <div class="vin-text-label">
                                <i class="fas fa-barcode"></i> Serial / VIN Verificado
                            </div>
                            <div class="vin-mono-code">${displayVin}</div>
                            <span style="font-size: 0.72rem; color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                <i class="fas fa-check-circle"></i> Certificado
                            </span>
                        </div>` : ''}
                    </div>

                    <div class="vehicle-description-box">
                        <h3>Equipamiento &amp; Observaciones</h3>
                        <p>${cleanDesc || 'Vehículo en óptimas condiciones mecánicas, estéticas y legales. Inspección completa aprobada y listo para entrega.'}</p>
                    </div>

                    <div class="vehicle-actions-stack">
                        <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, estoy interesado en la ${car.title} año ${car.year} (${car.price}) vista en la página web.`)}" target="_blank" rel="noopener" class="btn-action-whatsapp">
                            <i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> COTIZAR VEHÍCULO VÍA WHATSAPP
                        </a>
                        <button class="btn-action-share" onclick="navigator.clipboard.writeText(window.location.href); alert('Enlace del vehículo copiado al portapapeles');">
                            <i class="fas fa-share-alt"></i> Compartir Ficha del Vehículo
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="vehicle-trust-strip">
            <div class="trust-strip-item">
                <i class="fas fa-check-double trust-strip-icon"></i>
                <div class="trust-strip-info">
                    <strong>Certificación 150 Puntos</strong>
                    <span>Diagnóstico mecánico, eléctrico y estructural avalado.</span>
                </div>
            </div>
            <div class="trust-strip-item">
                <i class="fas fa-file-contract trust-strip-icon"></i>
                <div class="trust-strip-info">
                    <strong>Traspaso Inmediato</strong>
                    <span>Documentación legal y títulos listos para firmar.</span>
                </div>
            </div>
            <div class="trust-strip-item">
                <i class="fas fa-truck-ramp-box trust-strip-icon"></i>
                <div class="trust-strip-info">
                    <strong>Envíos Nacionales</strong>
                    <span>Traslado asegurado a cualquier ciudad del país.</span>
                </div>
            </div>
            <div class="trust-strip-item">
                <i class="fas fa-wrench trust-strip-icon"></i>
                <div class="trust-strip-info">
                    <strong>Respaldo MasterTech</strong>
                    <span>2 años de revisiones preventivas periódicas sin costo.</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('carDetailContainer').innerHTML = html;
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
    
    document.querySelectorAll('.v-thumb-img').forEach((t, idx) => {
        if (idx === index) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
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
