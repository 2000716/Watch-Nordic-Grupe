
    import { db, auth } from "../firebase-oppsett.js";
    import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
    import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

    // Hjelpefunksjon for å unngå XSS-injeksjoner i innerHTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function visMelding(tekst, type = "success") {
        const notif = document.getElementById("globalNotif");
        if (!notif) return;
        notif.className = `app-notification ${type}`;
        notif.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${escapeHtml(tekst)}`;
        notif.style.display = "block";
        setTimeout(() => { notif.style.display = "none"; }, 4000);
    }

    // --- AUTOMATISK INNSJEKKING VED OPPDATERING (PERSISTENS) ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const ansattSnap = await getDoc(doc(db, "ansatte", user.uid));
                if (ansattSnap.exists()) {
                    document.getElementById("loginSection")?.classList.add("hidden");
                    document.getElementById("adminSection")?.classList.remove("hidden");
                    lastInnAltData();
                } else {
                    visLoginSkjema();
                }
            } catch (err) {
                visLoginSkjema();
            }
        } else {
            visLoginSkjema();
        }
    });

    function visLoginSkjema() {
        document.getElementById("loginSection")?.classList.remove("hidden");
        document.getElementById("adminSection")?.classList.add("hidden");
    }

    async function simulerInnlogging() {
        const emailInput = document.getElementById("emailInput");
        const passwordInput = document.getElementById("passwordInput");
        const errorMsg = document.getElementById("loginErrorMsg");

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (errorMsg) errorMsg.style.display = "none";

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = "Feil ved innlogging (ugyldig e-post/passord).";
                errorMsg.style.display = "block";
            }
        }
    }

    window.simulerInnlogging = simulerInnlogging;

    document.getElementById("loginBtn")?.addEventListener("click", simulerInnlogging);

    window.byttTab = function(tab) {
        const tabs = ['oversikt', 'filmer', 'serier', 'leggTil'];
        tabs.forEach(t => {
            const contentEl = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
            const btnEl = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
            if (t === tab) {
                contentEl?.classList.remove("hidden");
                btnEl?.classList.add("active");
            } else {
                contentEl?.classList.add("hidden");
                btnEl?.classList.remove("active");
            }
        });

        if (tab === 'leggTil' && !document.getElementById("inpId")?.getAttribute("data-redigerer")) {
            nullstillSkjema();
        }
    }

    window.byttInnholdsType = function() {
        const type = document.getElementById("inpType").value;
        const filmFelt = document.getElementById("filmSpesifikkeFelt");
        const serieFelt = document.getElementById("serieSpesifikkeFelt");

        if (type === "serier") {
            filmFelt?.classList.add("hidden");
            serieFelt?.classList.remove("hidden");
        } else {
            filmFelt?.classList.remove("hidden");
            serieFelt?.classList.add("hidden");
        }
    }

    window.genererIDogAutomater = function() {
        if (!document.getElementById("inpId").getAttribute("data-redigerer")) {
            const tittel = document.getElementById("inpTittel").value;
            const id = tittel.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
            document.getElementById("inpId").value = id;
            document.getElementById("inpSubtitleUrl").value = id ? `${id}.VTT` : "";
        }
    }

    window.leggTilSesong = function(dataSesong = null) {
        const container = document.getElementById("sesongContainer");
        const sesongNr = container.children.length + 1;
        
        const div = document.createElement("div");
        div.className = "sesong-item";
        div.style.cssText = "background: #050F11; padding: 15px; border-radius: 6px; margin-bottom: 10px; border: 1px solid var(--border-color);";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>Sesong ${sesongNr}</strong>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:#FF5252; color:#fff; padding:4px 8px; font-size:11px;">Fjern sesong</button>
            </div>
            <input type="text" class="sesong-beskrivelse" placeholder="Beskrivelse for sesongen..." value="${escapeHtml(dataSesong ? dataSesong.beskrivelse : '')}" style="margin-top:10px;">
            <div class="episoder-container" style="margin-top:10px;"></div>
            <button type="button" onclick="leggTilEpisodTilSesong(this)" style="background:#0D2328; color:var(--text-main); border:1px solid var(--border-color); font-size:12px; margin-top:5px;"><i class="fas fa-plus"></i> Legg til episode</button>
        `;
        container.appendChild(div);

        if (dataSesong && dataSesong.episoder) {
            const epiContainer = div.querySelector(".episoder-container");
            Object.values(dataSesong.episoder).forEach(epi => {
                leggTilEpisodTilSesong(epiContainer, epi);
            });
        }
    }

    window.leggTilEpisodTilSesong = function(target, epiData = null) {
        let epiContainer = (target.nodeName === 'BUTTON') ? target.previousElementSibling : target;
        const epiNr = epiContainer.children.length + 1;

        let formattedDate = "";
        if (epiData && epiData.publishDate) {
            formattedDate = epiData.publishDate.slice(0, 16);
        }

        const div = document.createElement("div");
        div.className = "episode-item";
        div.style.cssText = "background: #0D2328; padding: 15px; border-radius: 6px; margin-top: 10px; border: 1px solid var(--border-color);";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="font-size:13px; color:var(--primary);">Episode ${epiNr}</strong>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background:#FF5252; color:#fff; padding:3px 6px; font-size:10px;">Fjern episode</button>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                <input type="text" class="epi-tittel" placeholder="Episode tittel..." value="${escapeHtml(epiData ? epiData.tittel : '')}" style="margin:0 0 10px 0;">
                <input type="text" class="epi-varighet" placeholder="Varighet..." value="${escapeHtml(epiData ? epiData.varighet : '')}" style="margin:0 0 10px 0;">
            </div>
            <textarea class="epi-beskrivelse" placeholder="Episodebeskrivelse..." style="margin:0 0 10px 0; height:60px;">${escapeHtml(epiData ? epiData.beskrivelse : '')}</textarea>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" class="epi-video" placeholder="Video URL (.mp4)" value="${escapeHtml(epiData ? epiData.videoUrl : '')}" style="margin:0 0 10px 0;">
                <input type="text" class="epi-thumb" placeholder="Thumbnail URL" value="${escapeHtml(epiData ? epiData.thumbnail : '')}" style="margin:0 0 10px 0;">
            </div>
            <div>
                <label style="font-size:11px; margin-top:0;">Publiseringsdato:</label>
                <input type="datetime-local" class="epi-pubdate" value="${formattedDate}" style="margin:2px 0 0 0;">
            </div>
        `;
        epiContainer.appendChild(div);
    }

    function forberedSkjemaDatoer() {
        const now = new Date();
        const future = new Date();
        future.setFullYear(now.getFullYear() + 2);
        if(!document.getElementById("inpPublishDate").value) {
            document.getElementById("inpPublishDate").value = now.toISOString().slice(0, 16);
            document.getElementById("inpExpireDate").value = future.toISOString().slice(0, 16);
        }
    }

    window.nullstillSkjema = function() {
        document.getElementById("skjemaTittelHeading").textContent = "Legg til ny tittel";
        document.getElementById("skjemaUnderTekst").textContent = "Fyll ut skjemaet for å publisere en film eller serie.";
        
        const inpId = document.getElementById("inpId");
        inpId.removeAttribute("data-redigerer");
        inpId.removeAttribute("readonly");
        inpId.style.background = "#050F11";
        inpId.style.color = "#ffffff";

        const inputs = document.querySelectorAll("#tabLeggTil input, #tabLeggTil textarea, #tabLeggTil select");
        inputs.forEach(input => {
            if(input.id !== 'inpType') input.value = "";
        });
        document.getElementById("sesongContainer").innerHTML = "";
        forberedSkjemaDatoer();
        byttInnholdsType();
    }

    window.lastInnAltData = async function(tvingOppdatering = false) {
        const filmBody = document.getElementById("filmTableBody");
        const serieBody = document.getElementById("serieTableBody");
        if (filmBody) filmBody.innerHTML = "";
        if (serieBody) serieBody.innerHTML = "";

        let filmerData = [];
        let serierData = [];
        let brukereData = [];

        const cachedData = sessionStorage.getItem("adminCache");
        const cacheTid = sessionStorage.getItem("adminCacheTid");
        const erCacheGyldig = cacheTid && (new Date().getTime() - cacheTid < 15 * 60 * 1000);

        if (!tvingOppdatering && erCacheGyldig && cachedData) {
            const parsed = JSON.parse(cachedData);
            filmerData = parsed.filmer || [];
            serierData = parsed.serier || [];
            brukereData = parsed.brukere || [];
        } else {
            const [filmSnap, serieSnap, brukereSnap] = await Promise.all([
                getDocs(collection(db, "filmer")),
                getDocs(collection(db, "serier")),
                getDocs(collection(db, "users"))
            ]);

            filmSnap.forEach(d => filmerData.push({ id: d.id, ...d.data() }));
            serieSnap.forEach(d => serierData.push({ id: d.id, ...d.data() }));
            brukereSnap.forEach(d => brukereData.push(d.data()));

            sessionStorage.setItem("adminCache", JSON.stringify({ filmer: filmerData, serier: serierData, brukere: brukereData }));
            sessionStorage.setItem("adminCacheTid", new Date().getTime());
        }

        filmerData.forEach(item => leggTilTabellRad("filmer", item.id, item));
        serierData.forEach(item => leggTilTabellRad("serier", item.id, item));

        document.getElementById("statTotaltInnhold").textContent = filmerData.length + serierData.length;
        document.getElementById("statAbonnenter").textContent = brukereData.length;

        let aktiveSiste24t = 0;
        const enDognSiden = new Date().getTime() - (24 * 60 * 60 * 1000);
        const dagerNavn = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
        const dagerTeller = { "Man": 0, "Tir": 0, "Ons": 0, "Tor": 0, "Fre": 0, "Lør": 0, "Søn": 0 };

        brukereData.forEach((data) => {
            const aktivTidStr = data.sistAktiv || data.sistInnlogget || data.opprettetDato;
            if (aktivTidStr) {
                const aktivDato = new Date(aktivTidStr);
                const tidMs = aktivDato.getTime();
                if (tidMs > enDognSiden) aktiveSiste24t++;
                const dagTekst = dagerNavn[aktivDato.getDay()];
                if (dagerTeller[dagTekst] !== undefined) dagerTeller[dagTekst]++;
            }
        });

        document.getElementById("statInnlogget").textContent = aktiveSiste24t;
        oppdaterSoyleDiagram(dagerTeller);
    }

    function oppdaterSoyleDiagram(dagerTeller) {
        const chartContainer = document.getElementById("chartBarsContainer");
        if (!chartContainer) return;
        chartContainer.innerHTML = "";
        const ukesRekkefolge = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
        const verdier = Object.values(dagerTeller);
        const maksVerdi = Math.max(...verdier, 1);

        ukesRekkefolge.forEach(dag => {
            const antall = dagerTeller[dag] || 0;
            const prosent = Math.round((antall / maksVerdi) * 100);
            const tilpassetProsent = antall > 0 ? Math.max(prosent, 12) : 5;

            const wrap = document.createElement("div");
            wrap.className = "chart-bar-wrap";
            wrap.innerHTML = `
                <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">${antall}</div>
                <div class="chart-bar" style="height: ${tilpassetProsent}%;"></div>
                <span class="chart-label">${escapeHtml(dag)}</span>
            `;
            chartContainer.appendChild(wrap);
        });
    }

    function leggTilTabellRad(samling, id, data) {
        const tr = document.createElement("tr");
        tr.className = "clickable-row";
        tr.id = `rad-${samling}-${id}`;
        const tittel = data.tittel || id;
        
        if (samling === "filmer") {
            const sjangerInfo = (Array.isArray(data.metadata) && data.metadata[2]) ? data.metadata[2] : "-";
            tr.innerHTML = `
                <td>${escapeHtml(id)}</td>
                <td><strong>${escapeHtml(tittel)}</strong></td>
                <td>${escapeHtml(sjangerInfo)}</td>
                <td>
                    <button class="btn-slett" data-samling="${samling}" data-id="${id}" style="background:#FF5252; color:#fff; padding:6px 12px; font-size:13px;" onclick="event.stopPropagation();"><i class="fas fa-trash"></i> Slett</button>
                </td>
            `;
            document.getElementById("filmTableBody")?.appendChild(tr);
        } else {
            const antSesonger = data.sesonger ? Object.keys(data.sesonger).length : 0;
            tr.innerHTML = `
                <td>${escapeHtml(id)}</td>
                <td><strong>${escapeHtml(tittel)}</strong></td>
                <td>${antSesonger} sesong(er)</td>
                <td>
                    <button class="btn-slett" data-samling="${samling}" data-id="${id}" style="background:#FF5252; color:#fff; padding:6px 12px; font-size:13px;" onclick="event.stopPropagation();"><i class="fas fa-trash"></i> Slett</button>
                </td>
            `;
            document.getElementById("serieTableBody")?.appendChild(tr);
        }

        tr.addEventListener("click", () => {
            apneRedigering(samling, id, data);
        });

        tr.querySelector(".btn-slett").addEventListener("click", async function() {
            if(confirm(`Er du sikker på at du vil slette "${tittel}"?`)) {
                try {
                    await deleteDoc(doc(db, samling, id));
                    tr.remove();

                    const cachedData = sessionStorage.getItem("adminCache");
                    if (cachedData) {
                        const parsed = JSON.parse(cachedData);
                        if (parsed[samling]) {
                            parsed[samling] = parsed[samling].filter(item => item.id !== id);
                            sessionStorage.setItem("adminCache", JSON.stringify(parsed));
                        }
                    }

                    visMelding("Tittelen ble slettet.", "success");
                } catch(err) {
                    visMelding("Feil ved sletting: " + err.message, "error");
                }
            }
        });
    }

    window.apneRedigering = function(samling, id, data) {
        byttTab('leggTil');
        document.getElementById("skjemaTittelHeading").textContent = `Redigerer: ${data.tittel || id}`;
        document.getElementById("skjemaUnderTekst").textContent = `Endre oppsettet for denne tittelen nedenfor. ID kan ikke endres.`;
        
        const inpId = document.getElementById("inpId");
        inpId.value = id;
        inpId.setAttribute("data-redigerer", "true");
        inpId.setAttribute("readonly", "true");
        inpId.style.background = "#050F11";
        inpId.style.color = "#777";

        document.getElementById("inpType").value = samling;
        byttInnholdsType();

        document.getElementById("inpTittel").value = data.tittel || "";
        document.getElementById("inpRating").value = data.rating || "";
        document.getElementById("inpBeskrivelse").value = data.beskrivelse || "";
        document.getElementById("inpRegissor").value = data.regissor || "";
        document.getElementById("inpSkuespillere").value = data.skuespillere || "";
        document.getElementById("inpLisens").value = data.lisens || "";

        if (data.metadata && Array.isArray(data.metadata)) {
            document.getElementById("metaAar").value = data.metadata[0] || "";
            document.getElementById("metaAldersgrense").value = data.metadata[1] || "";
            document.getElementById("metaSjanger").value = data.metadata[2] || "";
            document.getElementById("metaVarighet").value = data.metadata[3] || "";
        }

        document.getElementById("inpBakgrunn").value = data.bakgrunn || "";
        document.getElementById("inpBakgrunnMobil").value = data.bakgrunnMobil || "";
        document.getElementById("inpBanner").value = data.banner || "";
        document.getElementById("inpBannerMobil").value = data.bannerMobil || "";
        document.getElementById("inpPoster").value = data.poster || "";
        document.getElementById("inpPosterVertikal").value = data.posterVertikal || "";
        document.getElementById("inpLogo").value = data.logo || "";
        document.getElementById("inpTrailer").value = data.trailer || "";

        if (data.publishDate) {
            document.getElementById("inpPublishDate").value = new Date(data.publishDate).toISOString().slice(0, 16);
        }
        if (data.expireDate) {
            document.getElementById("inpExpireDate").value = new Date(data.expireDate).toISOString().slice(0, 16);
        }

        if (samling === "filmer") {
            document.getElementById("inpVideoUrl").value = data.videoUrl || "";
            document.getElementById("inpSubtitleUrl").value = data.subtitleUrl || "";
        } else if (samling === "serier" && data.sesonger) {
            document.getElementById("sesongContainer").innerHTML = "";
            Object.values(data.sesonger).forEach(ses => {
                leggTilSesong(ses);
            });
        }
    }

    window.lagreInnhold = async function() {
        const id = document.getElementById("inpId").value.trim();
        const samling = document.getElementById("inpType").value;
        const tittel = document.getElementById("inpTittel").value.trim();

        if (!id || !tittel) {
            visMelding("Tittel må fylles ut!", "error");
            return;
        }

        const metadataArray = [
            document.getElementById("metaAar").value.trim(),
            document.getElementById("metaAldersgrense").value.trim(),
            document.getElementById("metaSjanger").value.trim(),
            document.getElementById("metaVarighet").value.trim()
        ].filter(Boolean);

        const pubDateVal = document.getElementById("inpPublishDate").value;
        const expDateVal = document.getElementById("inpExpireDate").value;

        let obj = {
            tittel: tittel,
            rating: document.getElementById("inpRating").value.trim(),
            bakgrunn: document.getElementById("inpBakgrunn").value.trim(),
            bakgrunnMobil: document.getElementById("inpBakgrunnMobil").value.trim(),
            banner: document.getElementById("inpBanner").value.trim(),
            bannerMobil: document.getElementById("inpBannerMobil").value.trim(),
            logo: document.getElementById("inpLogo").value.trim(),
            trailer: document.getElementById("inpTrailer").value.trim(),
            poster: document.getElementById("inpPoster").value.trim(),
            posterVertikal: document.getElementById("inpPosterVertikal").value.trim(),
            beskrivelse: document.getElementById("inpBeskrivelse").value.trim(),
            metadata: metadataArray,
            skuespillere: document.getElementById("inpSkuespillere").value.trim(),
            regissor: document.getElementById("inpRegissor").value.trim(),
            lisens: document.getElementById("inpLisens").value.trim(),
            audioLanguages: [{ code: "en", label: "Engelsk" }],
            subtitleLanguages: [{ code: "no", label: "Norsk" }],
            publishDate: pubDateVal ? new Date(pubDateVal).toISOString() : new Date().toISOString(),
            expireDate: expDateVal ? new Date(expDateVal).toISOString() : null
        };

        if (samling === "filmer") {
            obj.videoUrl = document.getElementById("inpVideoUrl").value.trim();
            obj.subtitleUrl = document.getElementById("inpSubtitleUrl").value.trim();
            obj.watchUrl = `film-mal.html?id=${id}`;
            obj.tilbakeUrl = `film.html?navn=${id}`;
        } else {
            obj.tilbakeUrl = `serie.html?navn=${id}`;
            obj.sesonger = {};
            const sesongDivs = document.querySelectorAll("#sesongContainer .sesong-item");
            sesongDivs.forEach((sesDiv, sIndex) => {
                const sNummer = sIndex + 1;
                const sBesk = sesDiv.querySelector(".sesong-beskrivelse").value;
                const episoder = {};

                sesDiv.querySelectorAll(".episode-item").forEach((epiDiv, eIndex) => {
                    const eNummer = eIndex + 1;
                    const epiPubDate = epiDiv.querySelector(".epi-pubdate").value;
                    episoder[eNummer] = {
                        episodeNummer: eNummer,
                        tittel: epiDiv.querySelector(".epi-tittel").value.trim(),
                        beskrivelse: epiDiv.querySelector(".epi-beskrivelse").value.trim(),
                        varighet: epiDiv.querySelector(".epi-varighet").value.trim(),
                        thumbnail: epiDiv.querySelector(".epi-thumb").value.trim(),
                        publishDate: epiPubDate ? new Date(epiPubDate).toISOString().slice(0, 19) : "",
                        videoUrl: epiDiv.querySelector(".epi-video").value.trim()
                    };
                });

                obj.sesonger[sNummer] = {
                    sesongNummer: sNummer,
                    beskrivelse: sBesk,
                    episoder: episoder
                };
            });
        }

        try {
            // MERGE: true forhindrer utilsiktet sletting av uoppgitte felter i Firestore
            await setDoc(doc(db, samling, id), obj, { merge: true });
            
            sessionStorage.removeItem("adminCache");
            visMelding(`"${tittel}" ble oppdatert og lagret!`, "success");
            
            lastInnAltData(true);
            byttTab(samling);
            nullstillSkjema();
        } catch (err) {
            visMelding("Feil ved lagring: " + err.message, "error");
        }
    }

    window.filterTabell = function(type) {
        const query = document.getElementById(type === 'filmer' ? 'sokFilmer' : 'sokSerier').value.toLowerCase();
        const rows = document.querySelectorAll(type === 'filmer' ? '#filmTableBody tr' : '#serieTableBody tr');
        rows.forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none";
        });
    }
