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
                aniversario = birth.date.day + "-" + birth.date.month + "-" + birth.date.year;
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