let cart=[];
const cartDrawer=document.getElementById('cartDrawer'),overlay=document.getElementById('overlay'),cartItems=document.getElementById('cartItems'),cartCount=document.getElementById('cartCount'),cartTotal=document.getElementById('cartTotal'),searchPanel=document.getElementById('searchPanel'),searchInput=document.getElementById('searchInput'),mobileMenu=document.getElementById('mobileMenu');
function openCart(){cartDrawer.classList.add('active');overlay.classList.add('active')}
function closeCartDrawer(){cartDrawer.classList.remove('active');overlay.classList.remove('active')}
document.getElementById('cartBtn').addEventListener('click',openCart);
document.getElementById('closeCart').addEventListener('click',closeCartDrawer);
overlay.addEventListener('click',closeCartDrawer);
document.querySelectorAll('.quick-add').forEach(button=>button.addEventListener('click',()=>{cart.push({product:button.dataset.product,price:Number(button.dataset.price)});updateCart();openCart()}));
function updateCart(){cartCount.textContent=cart.length;if(!cart.length){cartItems.innerHTML='<p class="empty-cart">Your cart is empty.</p>';cartTotal.textContent='₹0';return}cartItems.innerHTML='';let total=0;cart.forEach((item,index)=>{total+=item.price;const div=document.createElement('div');div.className='cart-item';div.innerHTML=`<div><h4>${item.product}</h4><p>₹${item.price.toLocaleString('en-IN')}</p></div><button class="remove-item" data-index="${index}">REMOVE</button>`;cartItems.appendChild(div)});cartItems.querySelectorAll('.remove-item').forEach(btn=>btn.addEventListener('click',()=>{cart.splice(Number(btn.dataset.index),1);updateCart()}));cartTotal.textContent='₹'+total.toLocaleString('en-IN')}
document.querySelectorAll('.wishlist').forEach(button=>button.addEventListener('click',()=>{button.classList.toggle('active');button.textContent=button.classList.contains('active')?'♥':'♡'}));
document.getElementById('searchBtn').addEventListener('click',()=>{searchPanel.classList.add('active');searchInput.focus()});
document.getElementById('closeSearch').addEventListener('click',()=>{searchPanel.classList.remove('active');searchInput.value='';filterProducts('')});
searchInput.addEventListener('input',()=>filterProducts(searchInput.value.toLowerCase()));
function filterProducts(search){document.querySelectorAll('.product-card').forEach(card=>{card.style.display=card.dataset.name.toLowerCase().includes(search)?'':'none'})}
document.getElementById('menuBtn').addEventListener('click',()=>mobileMenu.classList.toggle('active'));
document.querySelectorAll('.mobile-menu a').forEach(link=>link.addEventListener('click',()=>mobileMenu.classList.remove('active')));
document.getElementById('newsletterForm').addEventListener('submit',function(event){event.preventDefault();alert('Welcome to ATTITUDE EMPIRE!');this.reset()});
document.getElementById('checkoutBtn').addEventListener('click',()=>{if(!cart.length){alert('Your cart is empty.');return}alert('Checkout and secure online payment will be connected in the next stage.')});
updateCart();