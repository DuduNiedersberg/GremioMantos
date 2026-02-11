/**
 * Azure Functions v4 Bootstrap Entrypoint
 * 
 * This file imports all function modules to register them with the Azure Functions runtime.
 * Each function module uses app.http() to register its endpoint.
 */

// Import all function modules to register endpoints
import './functions/auth'
import './functions/health';
import './functions/itens';
import './functions/vendas';
import './functions/transacoes';
import './functions/trocas';
import './functions/lotes';
import './functions/clientes';
import './functions/wishlist';
import './functions/historico-precos';
import './functions/qrcode';
import './functions/dashboard';
import './functions/update-password';



