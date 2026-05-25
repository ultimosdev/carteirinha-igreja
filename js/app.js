import { Membro } from './membro.js';
import { salvarMembro, listarMembros, deletarMembro, atualizarMembro } from './db-service.js';

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cadastro-form");
    const tabelaCorpo = document.getElementById("tabela-membros-corpo");
    
    // Elementos Câmera e Form
    const btnAbrirCamera = document.getElementById("btn-abrir-camera");
    const btnFecharCamera = document.getElementById("btn-fechar-camera");
    const areaCamera = document.getElementById("area-camera");
    const videoCamera = document.getElementById("video-camera");
    const btnCapturarFoto = document.getElementById("btn-capturar-foto");
    const canvasCamera = document.getElementById("canvas-camera");
    const previewContainer = document.getElementById("preview-foto-container");
    const previewFoto = document.getElementById("preview-foto");
    const inputBase64Capturada = document.getElementById("foto-base64-capturada");
    const fileInput = document.getElementById("membro-foto");
    const btnRemoverFoto = document.getElementById("btn-remover-foto");
    const controlesFoto = document.getElementById("controles-foto");
    
    const btnSalvar = document.getElementById("btn-salvar-form");
    const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
    const tituloFormulario = document.getElementById("titulo-formulario");
    const inputMembroId = document.getElementById("membro-id");

    let streamCamera = null;

    // --- FOTO E CÂMERA ---
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewFoto.src = event.target.result;
                    previewContainer.style.display = "block";
                    if (controlesFoto) controlesFoto.style.display = "none";
                    if (inputBase64Capturada) inputBase64Capturada.value = ""; 
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    if (btnAbrirCamera) {
        btnAbrirCamera.addEventListener("click", async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert("Navegador bloqueou a câmera.");
            try {
                streamCamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                videoCamera.srcObject = streamCamera;
                areaCamera.style.display = "flex";
                if (controlesFoto) controlesFoto.style.display = "none";
            } catch (err) { alert("Acesso negado à câmera."); }
        });
    }

    if (btnFecharCamera) {
        btnFecharCamera.addEventListener("click", () => {
            pararCamera();
            areaCamera.style.display = "none";
            if (controlesFoto) controlesFoto.style.display = "flex";
        });
    }

    if (btnCapturarFoto) {
        btnCapturarFoto.addEventListener("click", () => {
            const context = canvasCamera.getContext("2d");
            const MAX_WIDTH = 400;
            let scale = 1;
            if (videoCamera.videoWidth > MAX_WIDTH) scale = MAX_WIDTH / videoCamera.videoWidth;
            
            canvasCamera.width = videoCamera.videoWidth * scale;
            canvasCamera.height = videoCamera.videoHeight * scale;
            
            context.drawImage(videoCamera, 0, 0, canvasCamera.width, canvasCamera.height);
            const imageDataUrl = canvasCamera.toDataURL("image/jpeg", 0.75);
            
            if (inputBase64Capturada) inputBase64Capturada.value = imageDataUrl;
            if (previewFoto) previewFoto.src = imageDataUrl;
            
            pararCamera();
            areaCamera.style.display = "none";
            previewContainer.style.display = "block";
        });
    }

    if (btnRemoverFoto) {
        btnRemoverFoto.addEventListener("click", () => {
            if(inputBase64Capturada) inputBase64Capturada.value = "";
            if(previewFoto) previewFoto.src = "";
            if(fileInput) fileInput.value = ""; 
            previewContainer.style.display = "none";
            if(controlesFoto) controlesFoto.style.display = "flex";
        });
    }

    function pararCamera() {
        if (streamCamera) {
            streamCamera.getTracks().forEach(track => track.stop());
            streamCamera = null;
        }
    }
    
    // --- CADASTRO E EDIÇÃO ---
    atualizarTabela();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        let fotoFile = fileInput ? fileInput.files[0] : null;
        let fotoCapturadaBase64 = inputBase64Capturada ? inputBase64Capturada.value : "";
        let idEditando = inputMembroId.value;
        
        if (!idEditando && !fotoFile && !fotoCapturadaBase64) return alert("Por favor, adicione uma foto.");
        
        btnSalvar.innerText = "Salvando...";
        btnSalvar.disabled = true;

        const formData = new FormData(form);
        let fotoFinalBase64 = previewFoto.src && previewFoto.src.startsWith('data:') ? previewFoto.src : "";
        
        if (fotoCapturadaBase64) {
            fotoFinalBase64 = fotoCapturadaBase64;
        } else if (fotoFile) {
            fotoFinalBase64 = await comprimirImagemBase64(fotoFile);
        }

        const dadosMembro = {
            nome: formData.get("nome"), atividade: formData.get("atividade"),
            dataBatismo: formData.get("dataBatismo"), emissao: formData.get("emissao"),
            validade: formData.get("validade"), pai: formData.get("pai"),
            mae: formData.get("mae"), naturalidade: formData.get("naturalidade"),
            estadoCivil: formData.get("estadoCivil"), dataNascimento: formData.get("dataNascimento"),
            sexo: formData.get("sexo"), identidade: formData.get("identidade"), orgao: formData.get("orgao"),
            fotoUrl: fotoFinalBase64 
        };

        try {
            if (idEditando) {
                await atualizarMembro(parseInt(idEditando), dadosMembro);
                alert("Atualizado com sucesso!");
            } else {
                await salvarMembro(new Membro(dadosMembro));
                alert("Cadastrado com sucesso!");
            }
            resetarFormulario();
            atualizarTabela();
        } catch (error) { alert("Erro ao salvar."); } 
        finally { btnSalvar.innerText = "Cadastrar Membro"; btnSalvar.disabled = false; }
    });

    btnCancelarEdicao.addEventListener("click", resetarFormulario);

    function resetarFormulario() {
        form.reset();
        inputMembroId.value = "";
        tituloFormulario.innerText = "Novo Cadastro";
        btnSalvar.innerText = "Cadastrar Membro";
        btnCancelarEdicao.style.display = "none";
        if(btnRemoverFoto) btnRemoverFoto.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- TABELA E AÇÕES ---
    async function atualizarTabela() {
        const membros = await listarMembros();
        if(!tabelaCorpo) return;
        tabelaCorpo.innerHTML = "";
        
        membros.forEach(m => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="chk-membro" value="${m.id}"></td>
                <td>${m.nome}</td>
                <td>${m.atividade}</td>
                <td>
                    <button class="btn-view" data-id="${m.id}" style="background-color: #4CAF50; padding: 5px; border-radius: 4px; border: none; color: white; cursor: pointer;">Ver</button>
                    <button class="btn-editar" data-id="${m.id}" style="background-color: #2196F3; padding: 5px; border-radius: 4px; border: none; color: white; cursor: pointer;">Editar</button>
                    <button class="btn-del" data-id="${m.id}" style="background-color: #d9534f; padding: 5px; border-radius: 4px; border: none; color: white; cursor: pointer;">Excluir</button>
                </td>
            `;
            tabelaCorpo.appendChild(tr);
        });

        tabelaCorpo.onclick = async function(event) {
            const btn = event.target;
            const id = btn.getAttribute('data-id');
            if (btn.classList.contains('btn-view')) renderizarCarteirinha(membros.find(m => m.id == id));
            else if (btn.classList.contains('btn-editar')) preencherFormulario(membros.find(m => m.id == id));
            else if (btn.classList.contains('btn-del') && confirm("Deseja excluir?")) {
                await deletarMembro(parseInt(id)); atualizarTabela();
            }
        };
    }

    // MARCAR TODOS OS CHECKBOXES
    document.getElementById("chk-todos").addEventListener("change", (e) => {
        document.querySelectorAll(".chk-membro").forEach(chk => chk.checked = e.target.checked);
    });

    // IMPRIMIR SELECIONADOS (LOTE)
    document.getElementById("btn-imprimir-selecionados").addEventListener("click", async () => {
        const selecionados = Array.from(document.querySelectorAll(".chk-membro:checked")).map(chk => parseInt(chk.value));
        if (selecionados.length === 0) return alert("Selecione pelo menos um membro na tabela.");

        const membros = await listarMembros();
        const areaLote = document.getElementById("area-impressao-lote");
        
        // Junta todo o HTML das carteirinhas de uma vez só
        let htmlLote = "";
        selecionados.forEach(id => {
            const m = membros.find(x => x.id === id);
            if (m) {
                htmlLote += gerarTemplateHTMLCard(m);
            }
        });

        // Joga as carteirinhas na tela
        areaLote.innerHTML = htmlLote;

        // Dá meio segundo (500ms) para o navegador carregar as fotos antes de abrir a aba de impressão
        setTimeout(() => {
            window.print();
        }, 500);
    });

    // IMPRIMIR APENAS 1 (BOTÃO LÁ EM BAIXO)
    const btnPrint = document.getElementById("btn-print");
    if (btnPrint) {
        btnPrint.addEventListener("click", () => {
            const htmlDaTela = document.getElementById("carteirinha-print-area").innerHTML;
            document.getElementById("area-impressao-lote").innerHTML = `<div class="carteirinha-wrapper carteirinha-print-item">${htmlDaTela}</div>`;
            window.print();
        });
    }

    function preencherFormulario(m) {
        inputMembroId.value = m.id;
        ["nome", "atividade", "dataBatismo", "emissao", "validade", "pai", "mae", "naturalidade", "estadoCivil", "dataNascimento", "sexo", "identidade", "orgao"].forEach(campo => {
            form.elements[campo].value = m[campo] || "";
        });

        if (m.fotoUrl && m.fotoUrl !== "") {
            previewFoto.src = m.fotoUrl; inputBase64Capturada.value = m.fotoUrl;
            previewContainer.style.display = "block"; controlesFoto.style.display = "none";
        }
        tituloFormulario.innerText = "Editando Cadastro"; btnSalvar.innerText = "Atualizar Cadastro";
        btnCancelarEdicao.style.display = "block"; window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderizarCarteirinha(m) {
        const preencher = (id, valor) => document.getElementById(id).textContent = valor;
        preencher("card-view-nome", m.nome ? m.nome.toUpperCase() : "---");
        preencher("card-view-atividade", m.atividade || "---");
        preencher("card-view-batismo", formatarParaBR(m.dataBatismo));
        preencher("card-view-emissao", formatarParaBR(m.emissao));
        preencher("card-view-validade", formatarParaBR(m.validade));
        preencher("card-view-pai", m.pai || "---"); preencher("card-view-mae", m.mae || "---");
        preencher("card-view-nat", m.naturalidade || "---"); preencher("card-view-ec", m.estadoCivil || "---");
        preencher("card-view-nasc", formatarParaBR(m.dataNascimento)); preencher("card-view-sexo", m.sexo || "---");
        preencher("card-view-rg", m.identidade || "---"); preencher("card-view-orgao", m.orgao || "---");
        
        const fotoEl = document.getElementById("card-view-foto");
        if(fotoEl) fotoEl.style.backgroundImage = (m.fotoUrl && m.fotoUrl !== "") ? `url(${m.fotoUrl})` : "none";
        
        const previewSection = document.getElementById("preview-section");
        previewSection.style.display = "block"; previewSection.scrollIntoView({ behavior: 'smooth' });

        const btnZap = document.getElementById("btn-whatsapp");
        if(btnZap) {
            btnZap.onclick = async () => {
                btnZap.innerText = "Gerando..."; btnZap.disabled = true;
                document.body.classList.add("capturing-mode");
                try {
                    const canvas = await html2canvas(document.getElementById("area-para-snapshot"), { scale: 2, backgroundColor: "#ffffff", useCORS: true });
                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], `Carteirinha.png`, { type: "image/png" });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try { await navigator.share({ files: [file], text: 'Carteirinha' }); } catch (err) {}
                        } else {
                            const link = document.createElement('a'); link.download = file.name; link.href = URL.createObjectURL(blob); link.click();
                        }
                    });
                } catch (err) { alert("Erro ao gerar imagem."); }
                finally { document.body.classList.remove("capturing-mode"); btnZap.innerText = "WhatsApp"; btnZap.disabled = false; }
            };
        }
    }

    function formatarParaBR(dataISO) {
        if(!dataISO || dataISO === "") return "---";
        const partes = dataISO.split("-");
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataISO;
    }

    function comprimirImagemBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const scale = img.width > 400 ? 400 / img.width : 1;
                    canvas.width = img.width * scale; canvas.height = img.height * scale;
                    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.75)); 
                };
                img.src = event.target.result;
            };
        });
    }

    // --- TEMPLATE PARA IMPRESSÃO EM LOTE ---
    function gerarTemplateHTMLCard(m) {
        const bgImg = (m.fotoUrl && m.fotoUrl !== "") ? `url(${m.fotoUrl})` : 'none';
        return `
            <div class="carteirinha-wrapper carteirinha-print-item">
                <div class="card-face">
                    <div class="frente-header">
                        <div class="logo-placeholder"><img src="https://supabase.acheisistemas.com.br/storage/v1/object/public/midias/downloads/capas/ut0i542ysfh_1779282575921.png" class="logo-igreja"></div>
                        <div class="header-text">
                            <h3>IGREJA EVANGÉLICA ASSEMBLEIA DE DEUS</h3>
                            <p style="font-weight: bold; color: #cca43b;">MINISTÉRIO DE ANÁPOLIS</p>
                            <p>Av. Vale dos sonhos, Qd. 28 Lt. 25/26 - B. São Domingos - Goiânia GO</p>
                            <p>Pr. Manoel Ribeiro dos Santos</p>
                        </div>
                    </div>
                    <div class="frente-body">
                        <div class="foto-box"><div style="width: 100%; height: 100%; background-size: cover; background-position: center top; background-repeat: no-repeat; background-image: ${bgImg};"></div></div>
                        <div class="dados-principais">
                            <h4 class="membro-nome">${m.nome ? m.nome.toUpperCase() : "---"}</h4>
                            <div class="info-row"><div class="info-block"><label>Atividade:</label><span>${m.atividade || "---"}</span></div><div class="info-block"><label>Batismo/Águas:</label><span>${formatarParaBR(m.dataBatismo)}</span></div></div>
                            <div class="info-row"><div class="info-block"><label>Emissão:</label><span>${formatarParaBR(m.emissao)}</span></div><div class="info-block"><label>Validade:</label><span style="color: red;">${formatarParaBR(m.validade)}</span></div></div>
                        </div>
                    </div>
                    <div class="frente-footer">OBRIGATÓRIA A APRESENTAÇÃO DE DOCUMENTO DE IDENTIDADE</div>
                </div>
                <div class="card-face">
                    <div class="verso-body">
                        <div class="verso-grid">
                            <div class="verso-dados">
                                <div class="verso-info"><label>PAI:</label><span>${m.pai || "---"}</span></div>
                                <div class="verso-info"><label>MÃE:</label><span>${m.mae || "---"}</span></div>
                                <div style="display: flex; gap: 15px;"><div class="verso-info"><label>NATURALIDADE:</label><span>${m.naturalidade || "---"}</span></div><div class="verso-info"><label>ESTADO CIVIL:</label><span>${m.estadoCivil || "---"}</span></div></div>
                                <div style="display: flex; gap: 15px;"><div class="verso-info"><label>DATA DE NASC.:</label><span>${formatarParaBR(m.dataNascimento)}</span></div><div class="verso-info"><label>SEXO:</label><span>${m.sexo || "---"}</span></div></div>
                                <div style="display: flex; gap: 15px;"><div class="verso-info"><label>IDENTIDADE:</label><span>${m.identidade || "---"}</span></div><div class="verso-info"><label>ÓRGÃO:</label><span>${m.orgao || "---"}</span></div></div>
                                <p class="versiculo">"PORTANTO, IDE, ENSINAI TODAS AS NAÇÕES, BATIZANDO-AS EM NOME DO PAI, E DO FILHO, E DO ESPÍRITO SANTO." (MT 28.19)</p>
                            </div>
                            <div class="verso-side">
                                <div class="assinatura-area"><div class="linha-assinatura"></div><p>PASTOR</p></div>
                                <p class="verso-footer-text">VÁLIDO COMO IDENTIFICADOR DE MEMBRO DA IGREJA LOCAL.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
});