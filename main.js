Moralis.initialize('BAKilIUXq8eepgsEHeTNP5lpXiis023VLXIC5IzF');
Moralis.serverURL = 'https://avi2wqeysjlr.usemoralis.com:2053/server';

let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
  await Moralis.initPlugins();
  await Moralis.enableWeb3();
  await listAvailableTokens();
  currentUser = Moralis.User.current();
  if (currentUser) {
    document.getElementById('swap_button').disabled = true;
  }
}

async function listAvailableTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
  });
  tokens = result.tokens;

  let parent = document.getElementById('token_list');
  for (const address in tokens) {
    let token = tokens[address];

    let div = document.createElement('div');
    // div.setAttribute('data-address', address);
    div.className = 'token_row';
    let html = `
      <img class="token_list_img" src="${token.logoURI}"/>
      <span class="token_list_text">${token.symbol}</span>
      
      `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    parent.appendChild(div);
  }
}

function selectToken(address) {
  closeModal();
  //   let address = event.target.getAttribute('data-address');
  currentTrade[currentSelectSide] = tokens[address];
  console.log(currentTrade);
  renderInterface();
  getQuote();
}

function renderInterface() {
  if (currentTrade.from) {
    document.getElementById('from_token_img').src = currentTrade.from.logoURI;
    document.getElementById('from_token_text').innerHTML =
      currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    document.getElementById('to_token_img').src = currentTrade.to.logoURI;
    document.getElementById('to_token_text').innerHTML = currentTrade.to.symbol;
  }
}

async function login() {
  try {
    currentUser = Moralis.User.current();
    if (!currentUser) {
      currentUser = await Moralis.Web3.authenticate();
    }
    document.getElementById('swap_button').disabled = false;
  } catch (error) {
    console.log('error', error);
  }
}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById('token_modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('token_modal').style.display = 'none';
}

async function getQuote() {
  if (
    !document.getElementById('from_amount').value ||
    !currentTrade.from ||
    !currentTrade.to
  )
    return;

  let amount = Number(
    document.getElementById('from_amount').value *
      10 ** currentTrade.from.decimals
  );
  const quote = await Moralis.Plugins.oneInch.quote({
    chain: 'eth',
    fromTokenAddress: currentTrade.from.address,
    toTokenAddress: currentTrade.to.address,
    amount,
  });
  if (quote) {
    document.getElementById('to_amount').value =
      quote.toTokenAmount / 10 ** quote.toToken.decimals;
    document.getElementById('gas_estimate').innerHTML = quote.estimatedGas;
    console.log(quote);
  }
}

async function trySwap() {
  let address = Moralis.User.current().get('ethAddress');

  let amount = Number(
    document.getElementById('from_amount').value *
      10 ** currentTrade.from.decimals
  );
  if (currentTrade.from.symbol !== 'ETH') {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: 'eth',
      fromTokenAddress: currentTrade.from.address,
      fromAddress: address,
      amount,
    });

    console.log('ALLOWANCE', allowance);
    if (!allowance) {
      await Moralis.Plugins.oneInch.approve({
        chain: 'eth',
        tokenAddress: currentTrade.from.address,
        fromAddress: address,
      });
    }
  }

  let receipt = await doSwap(amount, address);
  console.log('RECEIPT=======', receipt);
  alert('SWAP COMPLETE');
}

async function doSwap(amount, address) {
  return Moralis.Plugins.oneInch.swap({
    chain: 'eth',
    fromTokenAddress: currentTrade.from.address,
    toTokenAddress: currentTrade.to.address,
    amount,
    fromAddress: address,
    slippage: 1,
  });
}

init();

document.getElementById('login_button').onclick = login;
document.getElementById('from_token_select').onclick = () => {
  openModal('from');
};
document.getElementById('to_token_select').onclick = () => {
  openModal('to');
};
document.getElementById('modal_close').onclick = closeModal;
document.getElementById('from_amount').onblur = getQuote;
document.getElementById('swap_button').onclick = trySwap;
