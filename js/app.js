import { Membro } from './membro.js';
import { salvarMembro, listarMembros, deletarMembro } from './db-service.js';

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cadastro-form");
    const tabelaCorpo = document.getElementById("tabela-membros-corpo");
    
    atualizarTabela();

    // 1. CADASTRAR MEMBRO
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const btnSalvar = form.querySelector("button[type='submit']");
        btnSalvar.innerText = "Salvando...";
        btnSalvar.disabled = true;

        const formData = new FormData(form);
        const fileInput = document.getElementById("membro-foto");
        const fotoFile = fileInput.files[0];

        let fotoBase64 = "https://via.placeholder.com/110x140?text=Sem+Foto";
        if (fotoFile) {
            fotoBase64 = await converterParaBase64(fotoFile);
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
            fotoUrl: fotoBase64 
        };

        const novoMembro = new Membro(dadosMembro);

        try {
            await salvarMembro(novoMembro);
            alert("Membro cadastrado com sucesso!");
            form.reset();
            atualizarTabela();
        } catch (error) {
            alert("Erro ao cadastrar.");
            console.error(error);
        } finally {
            btnSalvar.innerText = "Cadastrar Membro";
            btnSalvar.disabled = false;
        }
    });

    // 2. ATUALIZAR TABELA
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

        // Delegação de eventos da Tabela
        tabelaCorpo.onclick = async function(event) {
            const btn = event.target;
            const id = btn.getAttribute('data-id');
            
            if (btn.classList.contains('btn-view')) {
                const membroSelecionado = membros.find(m => m.id === id);
                if (membroSelecionado) renderizarCarteirinha(membroSelecionado);
            } 
            else if (btn.classList.contains('btn-del')) {
                if(confirm("Deseja realmente excluir este membro?")) {
                    await deletarMembro(id);
                    atualizarTabela();
                }
            }
        };
    }

    // 3. RENDERIZAR A CARTEIRINHA
    function renderizarCarteirinha(m) {
        // Preenche os dados
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
        
        // Exibe a seção de preview (Isso garante que o HTML exista visualmente antes de tirar a foto)
        const previewSection = document.getElementById("preview-section");
        previewSection.style.display = "block";
        previewSection.scrollIntoView({ behavior: 'smooth' });

        // Botão Imprimir
        const btnPrint = document.getElementById("btn-print");
        if(btnPrint) btnPrint.onclick = () => window.print();

        // Botão Compartilhar WhatsApp
        const btnZap = document.getElementById("btn-whatsapp");
        if(btnZap) {
            // Removemos cliques antigos para não acumular
            btnZap.onclick = null; 
            
            btnZap.onclick = async () => {
                const textoOriginal = btnZap.innerText;
                btnZap.innerText = "Gerando Imagem...";
                btnZap.disabled = true;

                try {
                    const areaSnapshot = document.getElementById("area-para-snapshot");
                    
                    // html2canvas tira a foto exata do momento
                    const canvas = await html2canvas(areaSnapshot, { 
                        scale: 2, 
                        backgroundColor: "#ffffff",
                        useCORS: true // Essencial para carregar imagens externas (como a logo)
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
                            // Fallback se não for HTTPS ou for Desktop sem Share API
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
                    btnZap.innerText = textoOriginal;
                    btnZap.disabled = false;
                }
            };
        }
    }

    // 4. FUNÇÕES DE APOIO
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