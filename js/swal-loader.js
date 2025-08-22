// SweetAlert2 CDN loader for vendas.html feedback
(function(){
  if (!window.Swal) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    script.onload = function() {
      window.Swal = window.Swal || window.swal;
    };
    document.head.appendChild(script);
  }
})();
