/**
 * Definições dos formulários de conformidade da Agrícola Famosa.
 * Eu portei estas definições do sistema original para garantir a continuidade do compliance.
 */
export const FORMS_METADATA = [
  {
    id: 'CL02',
    title: 'CL 02 - INSPEÇÃO PRÉ OPERACIONAL',
    version: 'V15 - 03.11.25',
    type: 'checklist',
    sectors: ['Packing House'],
    haccp: true,
    frequency: 'DIÁRIO',
    sections: [
      {
        title: '1- LIMPEZA GERAL',
        items: [
          { id: 'q1', label: 'Os baldes de resíduos recicláveis com material perecível estão devidamente fechados?' },
          { id: 'q2', label: 'Os recipientes estão identificados conforme a coleta seletiva?' },
          { id: 'q3', label: 'A área de corte de pedúnculo e etiquetas está limpa, sem restos de etiquetas, fitas ou papéis no chão?' },
          { id: 'q4', label: 'Há sujeira sob as esteiras ou máquinas?' },
          { id: 'q5', label: 'Existe material em desuso no packing House?' },
          { id: 'q6', label: 'A área externa do Packing House está com resíduos ou entulhos?' },
          { id: 'q7', label: 'A tela de proteção do packing house está em perfeitas condições, sem falhas que permitam o acesso de pássaros ou insetos?' },
          { id: 'q8', label: 'As armadilhas Internas e externas do Packing House têm proteção?' },
          { id: 'q9', label: 'Há presença de insetos ou animais dentro do packing house?' },
          { id: 'q10', label: 'Há indícios de alimentos dentro do packing house?' },
          { id: 'q11', label: 'O packing house está livre de odores e com os ralos limpos e em boas condições?' },
          { id: 'q12', label: 'As cortinas plásticas estão limpas e em boas condições, sem tocar o chão?' },
          { id: 'q13', label: 'As áreas de resfriamento estão visualmente limpas?' },
        ]
      },
      {
        title: '2- REQUISITOS BPF - HIGIENE PESSOAL',
        items: [
          { id: 'p1', label: 'Os trabalhadores receberam treinamento sobre higiene pessoal e BPF?' },
          { id: 'p2', label: 'Os funcionários responsáveis pela limpeza conhecem os procedimentos de codificação?' },
          { id: 'p3', label: 'Os trabalhadores foram treinados em casos de doenças infectocontagiosas?' },
          { id: 'p7', label: 'Todos lavam as mãos antes de retornar ao trabalho?' },
          { id: 'p8', label: 'Todos utilizam corretamente o uniforme, touca e botas?' },
        ]
      }
    ]
  },
  {
    id: 'F238',
    title: 'F238 - REGISTRO DE HIGIENE DO PACKING HOUSE',
    version: 'V14 - 10.11.25',
    type: 'table-log',
    sectors: ['Packing House'],
    frequency: 'DIVERSA',
    columns: [
      { key: 'action', label: 'Ação/Setor', type: 'text' },
      { key: 'freq', label: 'Freq.', type: 'text' },
      { key: 'product', label: 'Produto', type: 'select', options: ['Cloro', 'Multiflex', 'Detergente Clorado', 'Álcool em Gel'] },
      { key: 'time', label: 'Hora', type: 'time' },
      { key: 'responsible', label: 'Responsável', type: 'text' }
    ],
    preDefinedRows: [
      { action: 'Limpar mesa de seleção', freq: 'Diário' },
      { action: 'Limpar tesouras e facas', freq: 'Diário' },
      { action: 'Limpar Máquina Embalagem completa', freq: 'Diário' },
      { action: 'Limpar Serpentinas/Ventiladores', freq: 'Semanal' }
    ]
  }
];
