export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/55${cleanPhone}?text=${encodedMessage}`;
}

export function generateSaleMessage(item: any, price: number): string {
  return `🔵⚫⚪ *Bolicho do Grêmio - Vale dos Sinos*

📱 Camisa disponível:
*${item.nome}*

${item.ano ? `📅 Ano: ${item.ano}` : ''}
${item.marca ? `👕 Marca: ${item.marca}` : ''}
${item.jogador ? `⭐ Jogador: ${item.jogador}${item.numero ? ` #${item.numero}` : ''}` : ''}
${item.tamanho ? `📏 Tamanho: ${item.tamanho}` : ''}

💰 Valor: R$ ${price.toFixed(2).replace('.', ',')}

Interessado? Entre em contato!

*Tricolor de coração! 💙🖤🤍*`;
}

export function openWhatsApp(phone: string, message: string): void {
  const link = generateWhatsAppLink(phone, message);
  window.open(link, '_blank');
}
