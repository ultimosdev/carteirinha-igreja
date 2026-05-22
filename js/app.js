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
    
    // 1. Mostrar preview ao anexar um arquivo normal (PC ou Galeria)
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewFoto.src = event.target.result;
                    previewContainer.style.display = "block";
                    controlesFoto.style.display = "none";
                    inputBase64Capturada.value = ""; // Limpa a memória da câmera
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    // 2. Abrir a câmera
    if (btnAbrirCamera) {
        btnAbrirCamera.addEventListener("click", async () => {
            try {
                // facingMode: "user" tenta usar a câmera frontal no celular
                streamCamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                videoCamera.srcObject = streamCamera;
                areaCamera.style.display = "flex";
                controlesFoto.style.display = "none";
            } catch (err) {
                alert("Não foi possível acessar a câmera. Verifique se o navegador tem permissão.");
                console.error(err);
            }
        });
    }

    // 3. Cancelar e fechar a câmera
    if (btnFecharCamera) {
        btnFecharCamera.addEventListener("click", () => {
            pararCamera();
            areaCamera.style.display = "none";
            controlesFoto.style.display = "flex";
        });
    }

    // 4. Capturar a foto
    if (btnCapturarFoto) {
        btnCapturarFoto.addEventListener("click", () => {
            const context = canvasCamera.getContext("2d");
            canvasCamera.width = videoCamera.videoWidth;
            canvasCamera.height = videoCamera.videoHeight;
            context.drawImage(videoCamera, 0, 0, canvasCamera.width, canvasCamera.height);
            
            // Transforma o quadro de vídeo em uma imagem real
            const imageDataUrl = canvasCamera.toDataURL("image/png");
            inputBase64Capturada.value = imageDataUrl;
            previewFoto.src = imageDataUrl;
            
            pararCamera();
            areaCamera.style.display = "none";
            previewContainer.style.display = "block";
        });
    }

    // 5. Remover a foto escolhida e tentar de novo
    if (btnRemoverFoto) {
        btnRemoverFoto.addEventListener("click", () => {
            inputBase64Capturada.value = "";
            previewFoto.src = "";
            fileInput.value = ""; 
            previewContainer.style.display = "none";
            controlesFoto.style.display = "flex";
        });
    }

    function pararCamera() {
        if (streamCamera) {
            streamCamera.getTracks().forEach(track => track.stop());
            streamCamera = null;
        }
    }
    
    // ==========================================
    // LÓGICA DO CADASTRO (ATUALIZADA)
    // ==========================================
    atualizarTabela();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // VALIDAÇÃO DA FOTO: Verifica se tem arquivo anexado OU foto da câmera
        const fotoFile = fileInput.files[0];
        const fotoCapturadaBase64 = inputBase64Capturada.value;
        
        if (!fotoFile && !fotoCapturadaBase64) {
            alert("Por favor, tire uma foto ou anexe um arquivo antes de cadastrar.");
            return; // Bloqueia o envio se não tiver foto
        }
        
        const btnSalvar = form.querySelector("button[type='submit']");
        btnSalvar.innerText = "Salvando...";
        btnSalvar.disabled = true;

        const formData = new FormData(form);

        // Define qual foto usar
        let fotoFinalBase64 = "https://via.placeholder.com/110x140?text=Sem+Foto";
        if (fotoCapturadaBase64) {
            fotoFinalBase64 = fotoCapturadaBase64;
        } else if (fotoFile) {
            fotoFinalBase64 = await converterParaBase64(fotoFile);
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
            
            // Reseta toda a interface de foto após o cadastro
            inputBase64Capturada.value = "";
            previewFoto.src = "";
            previewContainer.style.display = "none";
            controlesFoto.style.display = "flex";
            
            atualizarTabela();
        } catch (error) {
            alert("Erro ao cadastrar.");
            console.error(error);
        } finally {
            btnSalvar.innerText = "Cadastrar Membro";
            btnSalvar.disabled = false;
        }
    });

    // ==========================================
    // OUTRAS FUNÇÕES DO SISTEMA (MANTIDAS)
    // ==========================================
    async function atualizarTabela() {
        const membros = await listarMembros();
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
        previewSection.style.display = "block";
        previewSection.scrollIntoView({ behavior: 'smooth' });

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
                            alert("Seu navegador não suporta envio direto. A imagem foi baixada para você enviar manualmente.");
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

    function converterParaBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
        });
    }
});