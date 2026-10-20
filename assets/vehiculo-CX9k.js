document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('id');

    if (!carId) {
        document.getElementById('carDetailContainer').innerHTML = `
            <div style="padding: 70px 24px; text-align: center; background: #FFFFFF; border-radius: 18px; border: 1px solid #E2E8F0; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05); max-width: 600px; margin: 30px auto;">
                <i class="fas fa-car-side" style="font-size: 2.8rem; color: #2563EB; margin-bottom: 14px; display: block;"></i>
                <h2 style="color: #0F172A; font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 800; margin-bottom: 8px;">Vehículo no seleccionado</h2>
                <p style="color: #64748B; font-size: 0.95rem; margin-bottom: 22px;">Explora nuestro inventario certificado para ver todas las unidades disponibles.</p>
                <a href="catalogo" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px; text-decoration: none; background: #2563EB; color: #FFFFFF; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.86rem;">
                    <i class="fas fa-arrow-left"></i> Volver al Catálogo Oficial
                </a>
            </div>`;
        return;
    }

    let car = null;
    let allVehicles = [];

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

    try {
        const listRes = await fetch('/api/vehicles');
        if (listRes.ok) {
            const listJson = await listRes.json();
            if (Array.isArray(listJson.data)) {
                allVehicles = listJson.data;
                if (!car) {
                    const found = allVehicles.find(v => String(v.id) === String(carId));
                    if (found) car = { ...found, bodyType: found.bodyType || found.body_type };
                }
            }
        }
    } catch (e) {}

    if (!car) {
        document.getElementById('carDetailContainer').innerHTML = `
            <div style="padding: 70px 24px; text-align: center; max-width: 600px; margin: 30px auto; background: #FFFFFF; border-radius: 18px; border: 1px solid #E2E8F0; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);">
                <i class="fas fa-car" style="font-size: 2.8rem; color: #94A3B8; margin-bottom: 14px; display: block;"></i>
                <h2 style="color: #0F172A; font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 800; margin-bottom: 10px;">Vehículo No Disponible</h2>
                <p style="color: #64748B; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">Este vehículo ha sido vendido o retirado de nuestro inventario oficial.</p>
                <a href="catalogo" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px; text-decoration: none; background: #2563EB; color: #FFFFFF; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.86rem;">
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
    } catch (e) {}

    window.currentCarImages = Array.isArray(car.images) ? car.images : [];
    window.currentImageIndex = 0;

    const bodyTypeMap = {
        suv: 'SUV / Camioneta',
        sedan: 'Sedán',
        pickup: 'Pick-Up',
        coupe: 'Deportivo / Coupé',
        van: 'Van / Comercial',
        hatchback: 'Hatchback'
    };
    const fallbackBodyType = bodyTypeMap[(car.bodyType || '').toLowerCase()] || car.bodyType || 'SUV / Vehículo';

    let whatsappNumber = "584248700438";
    const priceText = (!car.price || car.price === 'Consultar') ? 'Consultar Precio' : car.price;
    const cleanDesc = car.description ? car.description.split('\n\n[ADMIN-LINK]:')[0] : '';

    const totalImgs = window.currentCarImages.length;
    let imagesHtml = '';
    if (totalImgs > 0) {
        imagesHtml = `
            <div class="vehicle-page-gallery">
                <div id="mainVehicleImageContainer" class="main-vehicle-stage" onclick="openVehicleLightbox(window.currentImageIndex)">
                    <img id="mainVehicleImage" class="stage-main-img" src="${window.currentCarImages[0]}" alt="${car.title}">
                    <img src="images/CERTIFICADO---MASTERTECH.png" class="badge-stage-seal" alt="MasterTech Verified" onerror="this.style.display='none'">
                    ${totalImgs > 1 ? `
                    <button type="button" class="stage-nav-btn stage-nav-prev" onclick="event.stopPropagation(); stepMainVehicleImage(-1)" aria-label="Foto anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button type="button" class="stage-nav-btn stage-nav-next" onclick="event.stopPropagation(); stepMainVehicleImage(1)" aria-label="Siguiente foto">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="badge-stage-counter" id="mainStageCounter">
                        <i class="fas fa-camera"></i> <span>1 / ${totalImgs}</span>
                    </div>
                    ` : ''}
                    <div class="badge-stage-fullscreen">
                        <i class="fas fa-expand-alt"></i> Ampliar Foto
                    </div>
                </div>
                ${totalImgs > 1 ? `
                <div class="vehicle-thumbs-reel" id="vehicleThumbsReel">
                    ${window.currentCarImages.map((img, i) => `
                        <img src="${img}" class="v-thumb-img ${i === 0 ? 'active' : ''}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async" alt="Vista ${i + 1}" onclick="changeMainVehicleImage('${img}', ${i}, this)">
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

    const isImmediate = car.availability === 'entrega_inmediata' || car.origin === 'nacional';
    const availBadgeHtml = isImmediate
        ? `<span class="c-badge c-badge-status"><i class="fas fa-bolt"></i> Entrega Inmediata</span>`
        : `<span class="c-badge c-badge-order"><i class="fas fa-plane-arrival"></i> Por Pedido USA</span>`;

    const originFormatted = car.origin === 'nacional' ? 'Stock Local' : 'Importación Directa';

    let displayVin = car.vin || '';
    if (!displayVin && car.description) {
        const vm = car.description.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i) || car.description.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
        if (vm) displayVin = vm[1].toUpperCase();
    }

    // Related vehicles (up to 3 from same category or stock)
    const relatedList = allVehicles
        .filter(v => String(v.id) !== String(car.id) && Array.isArray(v.images) && v.images.length > 0)
        .sort((a, b) => {
            const sameTypeA = (a.bodyType || a.body_type) === car.bodyType ? 1 : 0;
            const sameTypeB = (b.bodyType || b.body_type) === car.bodyType ? 1 : 0;
            return sameTypeB - sameTypeA;
        })
        .slice(0, 3);

    const relatedHtml = relatedList.length > 0 ? `
        <div class="related-vehicles-section">
            <div class="related-section-header">
                <div>
                    <span class="related-section-pill"><i class="fas fa-sparkles"></i> INVENTARIO CERTIFICADO</span>
                    <h2 class="related-section-title">Vehículos Similares Disponibles</h2>
                </div>
                <a href="catalogo" class="btn-back-catalog">
                    Ver Todo el Catálogo <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            <div class="related-vehicles-grid">
                ${relatedList.map(rv => {
                    const rvImg = rv.images[0];
                    const rvOriginClass = rv.origin === 'nacional' ? 'nacional' : 'importado';
                    const rvOriginLabel = rv.origin === 'nacional' ? 'Nacional' : 'Importado';
                    return `
                    <div class="vehicle-card" onclick="window.location.href='vehiculo?id=${rv.id}'" style="cursor:pointer;">
                        <div class="vehicle-card-image">
                            <img src="${rvImg}" alt="${rv.title}" loading="lazy">
                            <img src="images/CERTIFICADO---MASTERTECH.png" class="mastertech-seal" alt="Certificado MasterTech" onerror="this.style.display='none'">
                        </div>
                        <div class="vehicle-card-body">
                            <div>
                                <span class="origin-badge ${rvOriginClass}">
                                    <i class="fas fa-check-circle"></i> ${rvOriginLabel}
                                </span>
                                <h3 class="vehicle-card-title">${rv.title}</h3>
                                <div class="vehicle-card-price">${rv.price || 'Consultar'}</div>
                            </div>
                            <div>
                                <div class="vehicle-card-specs">
                                    <div class="spec-item"><i class="fas fa-calendar-alt"></i> <span>${rv.year || 'N/A'}</span></div>
                                    <div class="spec-item"><i class="fas fa-road"></i> <span>${rv.km || '0 km'}</span></div>
                                    <div class="spec-item"><i class="fas fa-gas-pump"></i> <span>${rv.fuel || 'Gasolina'}</span></div>
                                    <div class="spec-item"><i class="fas fa-cog"></i> <span>${rv.transmission || 'Automática'}</span></div>
                                </div>
                                <div class="vehicle-card-cta">
                                    VER FICHA TÉCNICA <i class="fas fa-arrow-right"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    const html = `
        <div class="vehicle-breadcrumb-bar">
            <a href="catalogo" class="btn-back-catalog">
                <i class="fas fa-arrow-left"></i> Volver al Catálogo
            </a>
            <div class="breadcrumb-trail">
                <a href="/">Inicio</a>
                <i class="fas fa-chevron-right" style="font-size:0.65rem;"></i>
                <a href="catalogo">Catálogo</a>
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
                        <span class="c-badge c-badge-type"><i class="fas fa-location-dot"></i> ${originFormatted}</span>
                        ${availBadgeHtml}
                    </div>
                    <h1 class="vehicle-title-h1">${car.title}</h1>
                    <div class="vehicle-price-highlight">${priceText}</div>
                    <div class="price-sub-note">Documentación verificada • Revisión certificada de 150 puntos</div>

                    <div class="financing-hook-box">
                        <span><i class="fas fa-calculator" style="color: #2563EB; margin-right: 6px;"></i> Financiamiento disponible desde <strong>30% de inicial</strong></span>
                        <a href="calculadora" class="btn-calc-mini">Simular Cuota</a>
                    </div>

                    <div class="specs-dashboard-grid">
                        <div class="spec-dash-cell">
                            <i class="fas fa-calendar-alt spec-dash-icon"></i>
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
                            <i class="fas fa-cog spec-dash-icon"></i>
                            <div class="spec-dash-data">
                                <span class="spec-dash-label">Transmisión</span>
                                <span class="spec-dash-value">${car.transmission || 'Automática'}</span>
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
                                <i class="fas fa-barcode"></i> Serial / VIN
                            </div>
                            <div class="vin-mono-code">${displayVin}</div>
                            <span style="font-size: 0.7rem; color: #047857; font-weight: 700; background: #ECFDF5; padding: 3px 8px; border-radius: 6px; border: 1px solid #A7F3D0;">
                                <i class="fas fa-check-circle"></i> Verificado
                            </span>
                        </div>` : ''}
                    </div>

                    <div class="vehicle-description-box">
                        <h3>Equipamiento &amp; Observaciones</h3>
                        <p>${cleanDesc || 'Vehículo en óptimas condiciones mecánicas, estéticas y legales. Inspección completa aprobada y listo para entrega.'}</p>
                    </div>

                    <div class="vehicle-actions-stack">
                        <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, estoy interesado en el vehículo ${car.title} (${priceText}) visto en el catálogo oficial de Semi Nuevo Autos.`)}" target="_blank" rel="noopener" class="btn-action-whatsapp">
                            <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> CONSULTAR DISPONIBILIDAD POR WHATSAPP
                        </a>
                        <button class="btn-action-share" onclick="navigator.clipboard.writeText(window.location.href); this.innerHTML='<i class=\\'fas fa-check\\'></i> ¡Enlace copiado al portapapeles!';">
                            <i class="fas fa-share-alt"></i> Compartir Ficha Técnica
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
                    <strong>Traspaso Transparente</strong>
                    <span>Documentación legal y títulos listos para firmar.</span>
                </div>
            </div>
            <div class="trust-strip-item">
                <i class="fas fa-truck-ramp-box trust-strip-icon"></i>
                <div class="trust-strip-info">
                    <strong>Envíos a Nivel Nacional</strong>
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

        ${relatedHtml}
    `;

    document.getElementById('carDetailContainer').innerHTML = html;
});

window.stepMainVehicleImage = function(direction) {
    const images = window.currentCarImages || [];
    if (images.length <= 1) return;
    let nextIdx = (window.currentImageIndex || 0) + direction;
    if (nextIdx < 0) nextIdx = images.length - 1;
    if (nextIdx >= images.length) nextIdx = 0;
    const thumbs = document.querySelectorAll('.v-thumb-img');
    window.changeMainVehicleImage(images[nextIdx], nextIdx, thumbs[nextIdx]);
};

window.changeMainVehicleImage = function(src, index, thumbElement) {
    window.currentImageIndex = index;
    const mainImg = document.getElementById('mainVehicleImage');
    if (mainImg) {
        mainImg.style.opacity = '0.35';
        mainImg.onload = function() {
            mainImg.style.opacity = '1';
        };
        mainImg.src = src;
    }

    const counterEl = document.getElementById('mainStageCounter');
    if (counterEl && window.currentCarImages) {
        counterEl.innerHTML = `<i class="fas fa-camera"></i> <span>${index + 1} / ${window.currentCarImages.length}</span>`;
    }

    document.querySelectorAll('.v-thumb-img').forEach((t, idx) => {
        if (idx === index) {
            t.classList.add('active');
            try {
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (e) {}
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
        modal.style.cssText = 'position:fixed; inset:0; z-index:10000; background:rgba(15,23,42,0.95); backdrop-filter:blur(16px); display:flex; align-items:center; justify-content:center; flex-direction:column;';
        modal.innerHTML = `
            <button onclick="closeVehicleLightbox()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:1.3rem; width:46px; height:46px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10001;"><i class="fas fa-times"></i></button>
            <button onclick="navVehicleLightbox(-1)" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:1.3rem; width:50px; height:50px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10001;"><i class="fas fa-chevron-left"></i></button>
            <button onclick="navVehicleLightbox(1)" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:1.3rem; width:50px; height:50px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10001;"><i class="fas fa-chevron-right"></i></button>
            <div style="max-width:92vw; max-height:85vh; display:flex; align-items:center; justify-content:center;">
                <img id="lightboxImg" src="" style="max-width:92vw; max-height:85vh; object-fit:contain; border-radius:12px; box-shadow:0 20px 50px rgba(0,0,0,0.6); transition: opacity 0.2s ease;" alt="Vehículo">
            </div>
            <div id="lightboxCounter" style="color:#FFFFFF; font-size:0.9rem; font-weight:700; margin-top:16px; font-family:'Outfit', sans-serif; letter-spacing:1px;"></div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeVehicleLightbox();
        });
    }

    updateLightboxView();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeVehicleLightbox = function() {
    const modal = document.getElementById('vehicleLightboxModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.navVehicleLightbox = function(direction) {
    const images = window.currentCarImages || [];
    if (images.length === 0) return;
    window.currentImageIndex = (window.currentImageIndex + direction + images.length) % images.length;
    updateLightboxView();
    const thumbs = document.querySelectorAll('.v-thumb-img');
    window.changeMainVehicleImage(images[window.currentImageIndex], window.currentImageIndex, thumbs[window.currentImageIndex]);
};

function updateLightboxView() {
    const images = window.currentCarImages || [];
    const imgEl = document.getElementById('lightboxImg');
    const counterEl = document.getElementById('lightboxCounter');
    if (imgEl && images[window.currentImageIndex]) {
        imgEl.style.opacity = '0.3';
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        imgEl.src = images[window.currentImageIndex];
    }
    if (counterEl) {
        counterEl.textContent = `${window.currentImageIndex + 1} / ${images.length}`;
    }
}

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('vehicleLightboxModal');
    if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') closeVehicleLightbox();
        if (e.key === 'ArrowLeft') navVehicleLightbox(-1);
        if (e.key === 'ArrowRight') navVehicleLightbox(1);
    }
});
