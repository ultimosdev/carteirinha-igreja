export class Membro {
    constructor(dados) {
        this.nome = dados.nome;
        this.atividade = dados.atividade || "MEMBRO";
        this.dataBatismo = dados.dataBatismo;
        this.emissao = dados.emissao;
        this.validade = dados.validade;
        this.pai = dados.pai;
        this.mae = dados.mae;
        this.naturalidade = dados.naturalidade;
        this.estadoCivil = dados.estadoCivil;
        this.dataNascimento = dados.dataNascimento;
        this.sexo = dados.sexo;
        this.identidade = dados.identidade;
        this.orgao = dados.orgao;
        this.fotoUrl = dados.fotoUrl || "";
    }

    toFirestore() {
        return {
            nome: this.nome,
            atividade: this.atividade,
            dataBatismo: this.dataBatismo,
            emissao: this.emissao,
            validade: this.validade,
            pai: this.pai,
            mae: this.mae,
            naturalidade: this.naturalidade,
            estadoCivil: this.estadoCivil,
            dataNascimento: this.dataNascimento,
            sexo: this.sexo,
            identidade: this.identidade,
            orgao: this.orgao,
            fotoUrl: this.fotoUrl,
            dataCadastro: new Date().toISOString()
        };
    }
}
