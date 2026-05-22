import { Membro } from './membro.js';
import { salvarMembro, listarMembros, deletarMembro } from './db-service.js';

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cadastro-form");
    const tabelaCorpo = document.getElementById("tabela-membros-corpo");
    
    // --- ELEMENTOS DA CÂMERA ---
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
    let streamCamera = null;

    // ==========================================
    // LÓGICA DE ESCOLHA DE FOTO OU CÂMERA
    // ==========================================
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
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Seu navegador atual bloqueou a câmera ou site não está seguro (HTTPS). Tente abrir no Google Chrome oficial.");
                return;
            }
            try {
                streamCamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                videoCamera.srcObject = streamCamera;
                areaCamera.style.display = "flex";
                if (controlesFoto) controlesFoto.style.display = "none";
            } catch (err) {
                alert("Acesso negado à câmera. Verifique as permissões do seu navegador.");
                console.error(err);
            }
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
            
            // COMPRESSÃO DA CÂMERA: Evita que a foto fique pesada e trave o banco de dados
            const MAX_WIDTH = 400; // Tamanho ideal e leve
            let scale = 1;
            if (videoCamera.videoWidth > MAX_WIDTH) {
                scale = MAX_WIDTH / videoCamera.videoWidth;
            }
            canvasCamera.width = videoCamera.videoWidth * scale;
            canvasCamera.height = videoCamera.videoHeight * scale;
            
            context.drawImage(videoCamera, 0, 0, canvasCamera.width, canvasCamera.height);
            
            // Salvando em JPEG com 75% de qualidade (MUITO mais leve que PNG)
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
    
    // ==========================================
    // LÓGICA DO CADASTRO 
    // ==========================================
    atualizarTabela();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        let fotoFile = null;
        if (fileInput) fotoFile = fileInput.files[0];
        let fotoCapturadaBase64 = "";
        if (inputBase64Capturada) fotoCapturadaBase64 = inputBase64Capturada.value;
        
        if (!fotoFile && !fotoCapturadaBase64) {
            alert("Por favor, tire uma foto ou anexe um arquivo da galeria antes de cadastrar.");
            return;
        }
        
        const btnSalvar = form.querySelector("button[type='submit']");
        btnSalvar.innerText = "Salvando...";
        btnSalvar.disabled = true;

        const formData = new FormData(form);

        let fotoFinalBase64 = "https://via.placeholder.com/110x140?text=Sem+Foto";
        
        if (fotoCapturadaBase64) {
            fotoFinalBase64 = fotoCapturadaBase64; // Foto da câmera já está comprimida
        } else if (fotoFile) {
            // Comprime também a foto que veio do computador/galeria
            fotoFinalBase64 = await comprimirImagemBase64(fotoFile);
        }

        const dadosMembro = {
            nome: formData.get("nome"),
            atividade: formData.get("atividade"),
            dataBatismo: formData.get("dataBatismo"), 
            emissao: formData.get("emissao"),
            validade: formData.get("validade"),
            pai: formData.get("pai"),
            mae: formData.get("mae"),
            naturalidade: formData.get("naturalidade"),
            estadoCivil: formData.get("estadoCivil"),
            dataNascimento: formData.get("dataNascimento"),
            sexo: formData.get("sexo"),
            identidade: formData.get("identidade"),
            orgao: formData.get("orgao"),
            fotoUrl: fotoFinalBase64 
        };

        const novoMembro = new Membro(dadosMembro);

        try {
            await salvarMembro(novoMembro);
            alert("Membro cadastrado com sucesso!");
            form.reset();
            
            if(inputBase64Capturada) inputBase64Capturada.value = "";
            if(previewFoto) previewFoto.src = "";
            if(previewContainer) previewContainer.style.display = "none";
            if(controlesFoto) controlesFoto.style.display = "flex";
            
            atualizarTabela();
        } catch (error) {
            alert("Erro ao cadastrar. Verifique a conexão com a internet.");
            console.error(error);
        } finally {
            btnSalvar.innerText = "Cadastrar Membro";
            btnSalvar.disabled = false;
        }
    });

    // ==========================================
    // OUTRAS FUNÇÕES DO SISTEMA
    // ==========================================
    async function atualizarTabela() {
        const membros = await listarMembros();
        if(!tabelaCorpo) return;
        tabelaCorpo.innerHTML = "";
        
        membros.forEach(m => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${m.nome}</td>
                <td>${m.atividade}</td>
                <td>${m.identidade}</td>
                <td>
                    <button class="btn-view" data-id="${m.id}">Visualizar</button>
                    <button class="btn-del" data-id="${m.id}" style="background-color: #d9534f; margin-left: 5px;">Excluir</button>
                </td>
            `;
            tabelaCorpo.appendChild(tr);
        });

        tabelaCorpo.onclick = async function(event) {
            const btn = event.target;
            const id = btn.getAttribute('data-id');
            
            if (btn.classList.contains('btn-view')) {
                const membroSelecionado = membros.find(m => m.id === id);
                if (membroSelecionado) renderizarCarteirinha(membroSelecionado);
            } 
            else if (btn.classList.contains('btn-del')) {
                const confirmacao = confirm("Você realmente deseja excluir este cadastro? Esta ação não poderá ser desfeita.");
                if (confirmacao) {
                    await deletarMembro(id);
                    atualizarTabela();
                    alert("Cadastro excluído com sucesso!");
                }
            }
        };
    }

    function renderizarCarteirinha(m) {
        document.getElementById("card-view-nome").textContent = m.nome ? m.nome.toUpperCase() : "---";
        document.getElementById("card-view-atividade").textContent = m.atividade || "---";
        document.getElementById("card-view-batismo").textContent = formatarParaBR(m.dataBatismo);
        document.getElementById("card-view-emissao").textContent = formatarParaBR(m.emissao);
        document.getElementById("card-view-validade").textContent = formatarParaBR(m.validade);
        
        const fotoEl = document.getElementById("card-view-foto");
        if(fotoEl) fotoEl.src = m.fotoUrl || "";
        
        document.getElementById("card-view-pai").textContent = m.pai || "---";
        document.getElementById("card-view-mae").textContent = m.mae || "---";
        document.getElementById("card-view-nat").textContent = m.naturalidade || "---";
        document.getElementById("card-view-ec").textContent = m.estadoCivil || "---";
        document.getElementById("card-view-nasc").textContent = formatarParaBR(m.dataNascimento);
        document.getElementById("card-view-sexo").textContent = m.sexo || "---";
        document.getElementById("card-view-rg").textContent = m.identidade || "---";
        document.getElementById("card-view-orgao").textContent = m.orgao || "---";
        
        const previewSection = document.getElementById("preview-section");
        if(previewSection) {
            previewSection.style.display = "block";
            previewSection.scrollIntoView({ behavior: 'smooth' });
        }

        const btnPrint = document.getElementById("btn-print");
        if(btnPrint) btnPrint.onclick = () => window.print();

        const btnZap = document.getElementById("btn-whatsapp");
        if(btnZap) {
            btnZap.onclick = null; 
            
            btnZap.onclick = async () => {
                const textoOriginal = btnZap.innerText;
                btnZap.innerText = "Gerando Imagem...";
                btnZap.disabled = true;

                document.body.classList.add("capturing-mode");

                try {
                    const areaSnapshot = document.getElementById("area-para-snapshot");
                    const canvas = await html2canvas(areaSnapshot, { 
                        scale: 2, 
                        backgroundColor: "#ffffff",
                        useCORS: true 
                    });

                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], `Carteirinha_${m.nome}.png`, { type: "image/png" });

                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'Carteirinha',
                                    text: `Segue a carteirinha de ${m.nome}`
                                });
                            } catch (err) {
                                console.log("Compartilhamento cancelado pelo usuário.");
                            }
                        } else {
                            const link = document.createElement('a');
                            link.download = file.name;
                            link.href = URL.createObjectURL(blob);
                            link.click();
                            alert("Seu navegador não suporta envio direto. A imagem foi baixada.");
                        }
                    });
                } catch (err) {
                    console.error("Erro ao gerar:", err);
                    alert("Erro ao processar a imagem da carteirinha.");
                } finally {
                    document.body.classList.remove("capturing-mode");
                    btnZap.innerText = textoOriginal;
                    btnZap.disabled = false;
                }
            };
        }
    }

    function formatarParaBR(dataISO) {
        if(!dataISO || dataISO === "") return "---";
        const partes = dataISO.split("-");
        if(partes.length !== 3) return dataISO;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // NOVA FUNÇÃO: Comprime imagens de arquivo da Galeria
    function comprimirImagemBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 400; // Mantém a foto no tamanho exato pra não pesar
                    let scale = 1;
                    if (img.width > MAX_WIDTH) {
                        scale = MAX_WIDTH / img.width;
                    }
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Transforma em JPEG para o Firebase não bloquear o tamanho
                    resolve(canvas.toDataURL("image/jpeg", 0.75)); 
                };
                img.src = event.target.result;
            };
        });
    }
});