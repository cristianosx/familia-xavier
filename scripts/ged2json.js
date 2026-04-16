/**
 * Converte uma lista plana de pessoas para o formato de árvore de ancestrais.
 * @param {Array} flatList - Lista de objetos [{id, name, fatherId, motherId}, ...]
 * @param {string} rootId - O ID da pessoa que será a base da árvore (ex: você)
 */
function buildAncestryTree(flatList, rootId) {
    // 1. Criamos um mapa para acessar qualquer pessoa pelo ID instantaneamente
    const personMap = new Map();
    
    flatList.forEach(person => {
        personMap.set(person.id, { 
            first_name: person.first_name,
            name: person.name, 
            id: person.id, 
            children: [] // Inicializamos o array que o D3 vai usar
        });
    });

    // 2. Função recursiva para montar a árvore subindo pelas gerações
    function getAncestors(id) {
        const person = personMap.get(id);
        if (!person) return null;

        // Pegamos os dados originais da lista para saber quem são os pais
        const originalData = flatList.find(p => p.id === id);

        if (originalData) {
            // Se houver ID de pai ou mãe, buscamos recursivamente
            if (originalData.fatherId) {
                const father = getAncestors(originalData.fatherId);
                if (father) person.children.push(father);
            }
            if (originalData.motherId) {
                const mother = getAncestors(originalData.motherId);
                if (mother) person.children.push(mother);
            }
        }

        return person;
    }

    // 3. Iniciamos a construção a partir do ID raiz
    return getAncestors(rootId);
}

function formatarData(dataString) {
    // 1. Criar um objeto para mapear os meses
    const meses = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };

    // 2. Dividir a string pelo hífen
    const partes = dataString.split('-'); // ["7", "FEB", "1984"]

    // 3. Tratar o dia (garantir dois dígitos, ex: 7 vira 07)
    const dia = partes[0].padStart(2, '0');

    // 4. Buscar o número do mês no nosso mapa
    const mes = meses[partes[1].toUpperCase()];

    // 5. Pegar o ano
    const ano = partes[2];

    // 6. Retornar no formato desejado
    return `${dia}/${mes}/${ano}`;
}

function convertGedcomToD3Bidirectional(data, startId) {
    const indis = data.individuals;
    const families = data.families;

    // 1. Preparar os objetos de indivíduos com listas vazias
    for (let id in indis) {
        indis[id].id = id;
        indis[id]._parents = [];   // Armazenará objetos dos pais
        indis[id]._children = [];  // Armazenará objetos dos filhos
        indis[id].parentsCollapsed = true;
        indis[id].childrenCollapsed = true;
    }

    // 2. Mapear conexões através das famílias
    for (let famId in families) {
        const fam = families[famId];
        const fatherId = fam.husband;
        const motherId = fam.wife;
        const childrenIds = fam.children || [];

        childrenIds.forEach(cId => {
            if (indis[cId]) {
                // Adiciona pais ao filho
                if (fatherId && indis[fatherId]) indis[cId].parentIds = (indis[cId].parentIds || []).concat(fatherId);
                if (motherId && indis[motherId]) indis[cId].parentIds = (indis[cId].parentIds || []).concat(motherId);
                
                // Adiciona filho aos pais
                if (fatherId && indis[fatherId]) indis[fatherId].childIds = (indis[fatherId].childIds || []).concat(cId);
                if (motherId && indis[motherId]) indis[motherId].childIds = (indis[motherId].childIds || []).concat(cId);
            }
        });
    }

    // 3. Função Recursiva para construir a estrutura aninhada
    function buildHierarchy(id, type = 'both') {
        const person = indis[id];
        const birth = person.birth;
        let aniversario = "";
        if (!person) return null;
        if (birth) {
            if (birth.date != null) {
                aniversario = formatarData(birth.date.day + "-" + birth.date.month + "-" + birth.date.year);
            }
        }

        const node = {
            id: id,
            name: person.name.replace(/\//g, ''),
            first_name: person.first_name,
            birth: aniversario,
            isAncestor: type === 'up', // Marca se é ancestral
            isDescendant: type === 'down', // Marca se é descendente
            _parents: [],
            _children: []
        };

        // Popular Ancestrais (Caminho para Cima)
        if (type === 'both' || type === 'up') {
            (person.parentIds || []).forEach(pId => {
                const pNode = buildHierarchy(pId, 'up');
                if (pNode) node._parents.push(pNode);
            });
        }

        // Popular Descendentes (Caminho para Baixo)
        if (type === 'both' || type === 'down') {
            (person.childIds || []).forEach(cId => {
                const cNode = buildHierarchy(cId, 'down');
                if (cNode) node._children.push(cNode);
            });
        }

        return node;
    }

    return buildHierarchy(startId);
}

function convertGedcomToD3(data, startId) {
    const indis = data.individuals;
    const families = data.families;

    // 1. Preparar os indivíduos
    for (let id in indis) {
        indis[id].id = id;
        indis[id].parentsCollapsed = true;
        indis[id].childrenCollapsed = true;
        
        // Mapear em quais famílias esta pessoa é pai/mãe (FAMS)
        // e em qual família ela é filha (FAMC)
        indis[id].fams = []; // Famílias que a pessoa criou (casamentos)
    }

    // 2. Mapear as famílias para saber quem é cônjuge de quem
    for (let famId in families) {
        const fam = families[famId];
        if (fam.husband && indis[fam.husband]) indis[fam.husband].fams.push(famId);
        if (fam.wife && indis[fam.wife]) indis[fam.wife].fams.push(famId);
    }

    // Função auxiliar para formatar data (mantendo sua lógica)
    function getBirthDate(person) {
        if (person.birth && person.birth.date) {
            const d = person.birth.date;
            return formatarData(`${d.day || ''}-${d.month || ''}-${d.year || ''}`);
        }
        return "";
    }

    // 3. Função Recursiva adaptada
    function buildHierarchy(id, type = 'both') {
        const person = indis[id];
        if (!person) return null;

        const node = {
            id: id,
            name: person.name.replace(/\//g, ''),
            first_name: person.first_name,
            birth: getBirthDate(person),
            type: 'person', // Identificador de tipo
            isAncestor: type === 'up',
            isDescendant: type === 'down',
            _parents: [],
            _children: []
        };

        // --- SUBIR: Ancestrais (Pais) ---
        // Na genealogia clássica, pais costumam aparecer direto, mas se quiser 
        // nó de união para os avós, a lógica seria similar à de baixo.
        if (type === 'both' || type === 'up') {
            // Encontra a família onde esta pessoa é filha
            const birthFamily = Object.values(families).find(f => (f.children || []).includes(id));
            if (birthFamily) {
                if (birthFamily.husband) node._parents.push(buildHierarchy(birthFamily.husband, 'up'));
                if (birthFamily.wife) node._parents.push(buildHierarchy(birthFamily.wife, 'up'));
            }
        }

        // --- DESCER: Descendentes (União + Filhos) ---
        if (type === 'both' || type === 'down') {
            (person.fams || []).forEach(famId => {
                const fam = families[famId];
                const spouseId = fam.husband === id ? fam.wife : fam.husband;
                const spouse = indis[spouseId];

                // Criamos o Nó de União intermediário
                const unionNode = {
                    id: famId,
                    name: "União",
                    type: 'union',
                    isAncestor: false,
                    isDescendant: true,
                    spouseName: spouse ? spouse.name.replace(/\//g, '') : "Desconhecido",
                    _children: []
                };

                // Adicionamos os filhos a este Nó de União
                (fam.children || []).forEach(cId => {
                    const cNode = buildHierarchy(cId, 'down');
                    if (cNode) unionNode._children.push(cNode);
                });

                node._children.push(unionNode);
            });
        }

        return node;
    }

    return buildHierarchy(startId);
}

function convertGedcomToGraph(data) {
    const nodes = [];
    const links = [];
    const indis = data.individuals;
    const families = data.families;

    // 1. Criar os nós das PESSOAS
    // Também calculamos uma geração aproximada para o alinhamento vertical
    for (let id in indis) {
        const person = indis[id];
        nodes.push({
            id: id,
            name: person.name ? person.name.replace(/\//g, '') : "Sem Nome",
            first_name: person.first_name || "Sem Nome",
            birth: person.birth ? person.birth.date : "",
            type: 'person',
            // Opcional: Se seu JSON já tiver geração, use-o. 
            // Caso contrário, o D3 tentará organizar sozinho.
            generation: person.generation || 0 
        });
    }

    // 2. Criar os nós de UNIÃO e os LINKS
    for (let famId in families) {
        const fam = families[famId];
        const unionNodeId = `union_${famId}`;

        // Criamos um nó virtual para representar o casamento/união
        nodes.push({
            id: unionNodeId,
            type: 'union',
            // A união fica na mesma geração dos pais
            generation: indis[fam.husband]?.generation || 0 
        });

        // Link: Marido -> União
        if (fam.husband && indis[fam.husband]) {
            links.push({
                source: fam.husband,
                target: unionNodeId,
                type: 'marriage'
            });
        }

        // Link: Esposa -> União
        if (fam.wife && indis[fam.wife]) {
            links.push({
                source: fam.wife,
                target: unionNodeId,
                type: 'marriage'
            });
        }

        // Links: União -> Filhos
        if (fam.children && fam.children.length > 0) {
            fam.children.forEach(childId => {
                if (indis[childId]) {
                    links.push({
                        source: unionNodeId,
                        target: childId,
                        type: 'child'
                    });
                }
            });
        }
    }

    return { nodes, links };
}

/*function convertGedcomToD3(data, startId) {
    const indis = data.individuals;
    const families = data.families;

    // 1. Criar um mapeamento reverso: ID do Filho -> ID da Família
    // Isso é necessário porque seu JSON não diz no objeto do indivíduo quem é o pai,
    // mas o objeto da família diz quem são os filhos.
    const childToFamilyMap = {};
    for (let famId in families) {
        const family = families[famId];
        if (family.children) {
            family.children.forEach(childId => {
                childToFamilyMap[childId] = famId;
            });
        }
    }

    // 2. Função recursiva para montar a árvore de ancestrais
    function buildNode(id) {
        const person = indis[id];
        if (!person) return null;

        // Limpa o nome (remove as barras do GEDCOM: /Markus/ -> Markus)
        const cleanName = person.name ? person.name.replace(/\//g, '') : "Desconhecido";

        const node = {
            id: id,
            name: cleanName,
            _parents: []
        };

        // Busca a família onde esta pessoa é filha
        const parentFamId = childToFamilyMap[id];
        if (parentFamId) {
            const family = families[parentFamId];
            
            // Adiciona o Pai (Husband)
            if (family.husband) {
                const father = buildNode(family.husband);
                if (father) node._parents.push(father);
            }
            
            // Adiciona a Mãe (Wife)
            if (family.wife) {
                const mother = buildNode(family.wife);
                if (mother) node._parents.push(mother);
            }
        }

        return node;
    }

    return buildNode(startId);
}*/
// --- EXEMPLO DE USO ---

/*const meuGedcomJson = [
    { id: "1", name: "Isaac Warren", fatherId: "2", motherId: "3" },
    { id: "2", name: "Virgie Hampton", fatherId: "4", motherId: null },
    { id: "3", name: "Jared Evans", fatherId: null, motherId: null },
    { id: "4", name: "Ancestral Antigo", fatherId: null, motherId: null }
];

const treeFormatted = buildAncestryTree(meuGedcomJson, "1");

console.log(JSON.stringify(treeFormatted, null, 2));*/