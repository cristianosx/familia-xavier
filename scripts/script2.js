// 1. Dados de exemplo
const data = [
    { name: "A", value: 30 },
    { name: "B", value: 80 },
    { name: "C", value: 45 },
    { name: "D", value: 60 },
    { name: "E", value: 20 },
    { name: "F", value: 90 },
    { name: "G", value: 55 }
];

// 2. Dimensões do gráfico
//const margin = { top: 20, right: 30, bottom: 40, left: 40 };
//const width = 600 - margin.left - margin.right;
//const height = 400 - margin.top - margin.bottom;
const margin = {top: 20, right: 90, bottom: 30, left: 90},
width = 960 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;
// 3. Criar o SVG
//const svg = d3.select("#chart")
//    .append("svg")
//    .attr("width", width + margin.left + margin.right)
//    .attr("height", height + margin.top + margin.bottom)
//    .append("g")
//    .attr("transform", `translate(${margin.left},${margin.top})`);
const svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const jsonPath = "data/data.json";

d3.json(jsonPath).then(function(treeData) {
    
    // --- Toda a lógica do D3 que vimos antes entra aqui ---
    
    const margin = {top: 20, right: 90, bottom: 30, left: 90},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#tree-container").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const treemap = d3.tree().size([width, height]);

    // O objeto 'treeData' agora contém o conteúdo do seu JSON
    let nodes = d3.hierarchy(treeData, d => d.children);
    nodes = treemap(nodes);

    // 1. Cria as linhas de conexão (links)
    svg.selectAll(".link")
        .data(nodes.descendants().slice(1))
        .enter().append("path")
        .attr("class", "link")
        .style("fill", "none")
        .style("stroke", "#ccc")
        .style("stroke-width", "2px")
        .style("shape-rendering", "crispEdges")
        .attr("d", d => {
            const meioY = (d.y + d.parent.y) / 2;
            // M: Inicia no Pai (x, y)
            // V: Desce Verticalmente até o meio
            // H: Move Horizontalmente até a coluna do Filho
            // V: Desce Verticalmente até a posição final do Filho
            return `M${d.parent.x},${d.parent.y}
                    V${meioY}
                    H${d.x}
                    V${d.y}`;
        });
        /*L${(d.y + d.parent.y) / 2},${d.x}
        L${(d.y + d.parent.y) / 2},${d.parent.x}*/

    // 2. Cria os grupos para cada nó
    const node = svg.selectAll(".node")
        .data(nodes.descendants())
        .enter().append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => `translate(${d.x},${d.y})`);

    // 3. Adiciona o círculo do nó
    node.append("circle")
    .attr("r", 10)
    .style("fill", d => d.children ? "#555" : "#999");

    // 4. Adiciona o texto (nome)
    node.append("text")
    .attr("dy", "20px")
    .attr("x", 0)
    .style("text-anchor", "middle")
    .text(d => d.data.name)
    .style("font-family", "sans-serif")
    .style("font-size", "12px");

    // ... restante do código de links, círculos e textos ...
    console.log("Dados carregados com sucesso:", treeData);

}).catch(function(error) {
    // Caso o arquivo não seja encontrado ou o JSON esteja mal formatado
    console.error("Erro ao carregar o arquivo JSON:", error);
});

/*const treeData = {
  name: "Patriarca/Matriarca",
  children: [
    {
      name: "Filho 1",
      children: [
        { name: "Neto 1.1" },
        { name: "Neto 1.2" }
      ]
    },
    {
      name: "Filho 2",
      children: [
        { name: "Neto 2.1" }
      ]
    }
  ]
};*/

/*
// Declara o layout da árvore
const treemap = d3.tree().size([height, width]);

// Atribui os dados a uma hierarquia e define as posições
let nodes = d3.hierarchy(treeData, d => d.children);
nodes = treemap(nodes);

// 1. Cria as linhas de conexão (links)
svg.selectAll(".link")
    .data(nodes.descendants().slice(1))
    .enter().append("path")
    .attr("class", "link")
    .style("fill", "none")
    .style("stroke", "#ccc")
    .style("stroke-width", "2px")
    .attr("d", d => {
       return "M" + d.y + "," + d.x
         + "C" + (d.y + d.parent.y) / 2 + "," + d.x
         + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
         + " " + d.parent.y + "," + d.parent.x;
       });

// 2. Cria os grupos para cada nó
const node = svg.selectAll(".node")
    .data(nodes.descendants())
    .enter().append("g")
    .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
    .attr("transform", d => `translate(${d.y},${d.x})`);

// 3. Adiciona o círculo do nó
node.append("circle")
  .attr("r", 10)
  .style("fill", d => d.children ? "#555" : "#999");

// 4. Adiciona o texto (nome)
node.append("text")
  .attr("dy", ".35em")
  .attr("x", d => d.children ? -13 : 13)
  .style("text-anchor", d => d.children ? "end" : "start")
  .text(d => d.data.name)
  .style("font-family", "sans-serif")
  .style("font-size", "12px");
  */