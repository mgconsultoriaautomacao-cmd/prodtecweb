async function analyzeBox(fruit, registeredBoxes) {
  try {
    const res = await fetch('http://localhost:5000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fruit: fruit || '',
        registered_boxes: registeredBoxes || []
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return {
      ok: data.ok ?? true,
      caliber: data.caliber ?? 'NÃO IDENTIF.',
      count: data.count ?? 0,
      confidence: data.confidence ?? 0.0,
      box_model: data.box_model ?? 'NÃO IDENTIF.',
      detected_weight: data.detected_weight ?? 0,
      status: 'success'
    };
  } catch (err) {
    console.error('[cvService] Error calling cv_service.py API:', err.message);
    return {
      ok: false,
      caliber: 'ERRO_CONEXAO',
      count: 0,
      confidence: 0.0,
      box_model: 'NÃO IDENTIF.',
      detected_weight: 0,
      status: 'error'
    };
  }
}

module.exports = { analyzeBox };
