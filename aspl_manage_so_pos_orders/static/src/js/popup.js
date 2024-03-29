odoo.define('aspl_manage_so_pos_orders.popup', function (require) {
	"use strict";

	var PopupWidget = require('point_of_sale.popups');
	var gui = require('point_of_sale.gui');
	var core = require('web.core');
	var rpc = require('web.rpc');

	var _t = core._t;

	var SaleOrderConfirmPopupWidget = PopupWidget.extend({
	    template: 'SaleOrderConfirmPopupWidget',
	});
	gui.define_popup({name:'saleOrder', widget: SaleOrderConfirmPopupWidget});

    var SaleOrderPopup = PopupWidget.extend({
	    template: 'SaleOrderPopup',
	    show: function(options){
	        var self = this;
	        this._super(options);
	        this.delivery_done = options.delivery_done ? true : false;
	        var order = self.pos.get_order();
	        var options = options || {};
	        this.sale_order_button = options.sale_order_button ||
	        self.pos.gui.screen_instances.products.action_buttons.EditQuotationButton || false
	        self.payment_obj = self.pos.chrome.screens.payment || false;
	        if (self.payment_obj){
                window.document.body.removeEventListener('keypress',self.payment_obj.keyboard_handler);
                window.document.body.removeEventListener('keydown',self.payment_obj.keyboard_keydown_handler);
            }
	        if (order.get_client()){
	        	var params = {
    				model: 'res.partner',
    				method: 'search_read',
    				domain: [['parent_id', '=', order.get_client().id]]
    			}
    			rpc.query(params, {async: false}).then(function(contacts){
	                self.contacts = contacts;
	            });
	        }

	        self.renderElement();
	        var canvas = new fabric.Canvas('canvas');
	        this.canvas = canvas;
            canvas.observe('mouse:move', function(o){
				canvas.isDrawingMode = 1;
				canvas.freeDrawingBrush.width = 3;
				canvas.freeDrawingBrush.color = '#4c4c4c';
			});
			canvas.on('mouse:up', function(o){
				canvas.isDrawingMode = 0;
			});
			this.$('.clear').click(function(){
                canvas.clear()
	        });
	        if(order.get_edit_quotation()){
	            if(order.get_sale_order_date()){
	                var date_order = moment(order.get_sale_order_date(), 'YYYY-MM-DD HH:mm');
                    $('#orderdate-datepicker').val(date_order.format('YYYY-MM-DD HH:mm'));
                }
	            if(order.set_sale_order_requested_date()){
	                var date_order = moment(order.get_sale_order_requested_date(), 'YYYY-MM-DD HH:mm');
                    $('#requesteddate-datepicker').val(date_order.format('YYYY-MM-DD HH:mm'));
                }
                var shipping_contact = _.find(self.contacts, function(o){
                    return o.id == order.get_shipping_address();
                })
                $('.shipping_contact_selection').val(shipping_contact ? shipping_contact.id : 0);
                var invoice_contact = _.find(self.contacts, function(o){
                    return o.id == order.get_invoice_address();
                })
                $('.invoicing_contact_selection').val(invoice_contact ? invoice_contact.id : 0);
	        }

            $('textarea.sale_order_note').focus(function() {
                if(self.payment_obj){
                     $('body').off('keypress', self.keyboard_handler);
                     $('body').off('keydown', self.keyboard_keydown_handler);
                     window.document.body.removeEventListener('keypress',self.keyboard_handler);
                     window.document.body.removeEventListener('keydown',self.keyboard_keydown_handler);
                 }
            });
	    },
	    click_confirm: function(){
	        var self = this;
	        var order = self.pos.get_order();
	        var blank = document.createElement('canvas');
            blank.width = canvas.width;
            blank.height = canvas.height;
            if(blank.toDataURL() != canvas.toDataURL()){
                order.set_signature(canvas.toDataURL().split('data:image/png;base64,')[1]);
            }
	        if($('.sale_order_note').val()){
	            order.set_sale_note($.trim($('.sale_order_note').val()));
	        }
	        order.set_sale_order_date($('#orderdate-datepicker').val() || false);
	        order.set_sale_order_requested_date($('#requesteddate-datepicker').val() || false)
            if(self.shipping_contact() && self.invoice_contact()){
                if(self.sale_order_button){
                    self.sale_order_button.renderElement();
                }
                if(self.payment_obj){
                    order.set_paying_sale_order(true);
                    window.document.body.addEventListener('keypress',self.payment_obj.keyboard_handler);
                    window.document.body.addEventListener('keydown',self.payment_obj.keyboard_keydown_handler);
                }
                self.gui.close_popup();
                self.pos.create_sale_order(self.delivery_done);
            }
	    },
	    click_cancel: function(){
	        var self = this;
	        if(self.payment_obj){
                window.document.body.addEventListener('keypress',self.payment_obj.keyboard_handler);
                window.document.body.addEventListener('keydown',self.payment_obj.keyboard_keydown_handler);
                $('#btn_so').show();
            }
            this.gui.close_popup();
	    },
	    renderElement: function(){
	        var self = this;
	        this._super();
			$('#orderdate-datepicker').datetimepicker({format:'Y-m-d H:i'}).val(new moment ().format("YYYY-MM-DD HH:mm"));
			$('#requesteddate-datepicker').datetimepicker({format:'Y-m-d H:i'}).val(new moment ().format("YYYY-MM-DD HH:mm"));
            $(".tabs-menu a").click(function(event) {
                event.preventDefault();
                $(this).parent().addClass("current");
                $(this).parent().siblings().removeClass("current");
                var tab = $(this).attr("href");
                $(".tab-content").not(tab).css("display", "none");
                $(tab).fadeIn();
            });
            $('.invoice_diff_address').click(function(){
                if($(this).prop('checked')){
                    if(self.payment_obj){
                        $('body').off('keypress', self.payment_obj.keyboard_handler);
                        $('body').off('keydown', self.payment_obj.keyboard_keydown_handler);
                        window.document.body.removeEventListener('keypress',self.payment_obj.keyboard_handler);
                        window.document.body.removeEventListener('keydown',self.payment_obj.keyboard_keydown_handler);
                    }
                    $('.invoicing_contact_selection').attr({'disabled': 'disabled'});
                    $('div.invoice_create_contact').show();
                } else {
                    $('.invoicing_contact_selection').removeAttr('disabled');
                    $('div.invoice_create_contact').hide();
                }
            });
            $('.ship_diff_address').click(function(){
                if($(this).prop('checked')){
                    if(self.payment_obj){
                        $('body').off('keypress', self.payment_obj.keyboard_handler);
                        $('body').off('keydown', self.payment_obj.keyboard_keydown_handler);
                        window.document.body.removeEventListener('keypress',self.payment_obj.keyboard_handler);
                        window.document.body.removeEventListener('keydown',self.payment_obj.keyboard_keydown_handler);
                    }
                    $('.shipping_contact_selection').attr({'disabled': 'disabled'});
                    $('div.ship_create_contact').show();
                } else {
                    $('.shipping_contact_selection').removeAttr('disabled');
                    $('div.ship_create_contact').hide();
                }
            });
            $('.ship_create_contact').find('.client_state').autocomplete({
				source: self.pos.states || false,
				select: function (event, ui) {
				    self.shipping_state = ui.item.id;
					return ui.item.value
				}
			});
			$('.ship_create_contact').find('.client_country').autocomplete({
				source: self.pos.countries || false,
				select: function (event, ui) {
				    self.shipping_country = ui.item.id;
					return ui.item.value
				}
			});
			$('.invoice_create_contact').find('.client_state').autocomplete({
				source: self.pos.states || false,
				select: function (event, ui) {
				    self.invoice_state = ui.item.id;
					return ui.item.value
				}
			});
			$('.invoice_create_contact').find('.client_country').autocomplete({
				source: self.pos.countries || false,
				select: function (event, ui) {
				    self.invoice_country = ui.item.id;
					return ui.item.value
				}
			});


	    },
	    shipping_contact: function(){
	        var self = this;
	        var order = self.pos.get_order();
	        var shipping_contact = $('.shipping_contact_selection option:selected').val();
	        if(shipping_contact > 0 && !$('.ship_diff_address').prop('checked')){
                order.set_shipping_address(shipping_contact);
                return true;
	        } else if($('.ship_diff_address').prop('checked')){
	        	var name = $('.ship_create_contact').find('.client_name');
	        	if(!name.val()){
	        	    $(name).attr('style', 'border: thin solid red !important');
	        	    return false
	        	}
	            var state = self.shipping_state || false;
	            var country = self.shipping_country || false;
	            var vals = {
            		'name': $('.ship_create_contact').find('.client_name').val(),
	                'email': $('.ship_create_contact').find('.client_email').val(),
	                'city': $('.ship_create_contact').find('.client_city').val(),
	                'state_id':  state,
	                'zip': $('.ship_create_contact').find('.client_zip').val(),
	                'country_id':  country,
	                'mobile': $('.ship_create_contact').find('.client_mobile').val(),
	                'phone': $('.ship_create_contact').find('.client_phone').val(),
	                'parent_id': order.get_client().id,
	                'type': 'delivery',
                }
                var params = {
    				model: 'res.partner',
    				method: 'create',
    				args: [vals, {}],
    			}
	            rpc.query(params, {async: false}).then(function(res){
	            	if(res){
	                    order.set_shipping_address(res);
	                }
	            });
	        }
	        return true;
	    },
	    invoice_contact: function(){
	        var self = this;
	        var order = self.pos.get_order();
	        var invoice_contact = $('.invoicing_contact_selection option:selected').val();
	        if(invoice_contact > 0 && !$('.invoice_diff_address').prop('checked')){
                order.set_invoice_address(invoice_contact);
                return true;
	        } else if($('.invoice_diff_address').prop('checked')){
	            var name = $('.invoice_create_contact').find('.client_name');
	        	if(!name.val()){
	        	    $(name).attr('style', 'border: thin solid red !important');
	        	    return false
	        	}
	            var state = self.invoice_state || false;
	            var country = self.invoice_country || false;
	            var vals = {
	                'name': $('.invoice_create_contact').find('.client_name').val(),
	                'email': $('.invoice_create_contact').find('.client_email').val(),
	                'city': $('.invoice_create_contact').find('.client_city').val(),
	                'state_id':  state,
	                'zip': $('.invoice_create_contact').find('.client_zip').val(),
	                'country_id':  country,
	                'mobile': $('.invoice_create_contact').find('.client_mobile').val(),
	                'phone': $('.invoice_create_contact').find('.client_phone').val(),
	                'parent_id': order.get_client().id,
	                'type': 'invoice',
	            }
	            var params = {
    				model: 'res.partner',
    				method: 'create',
    				args: [vals, {}],
    			}
	            rpc.query(params, {async: false}).then(function(res){
	            	if(res){
	                    order.set_shipping_address(res);
	                }
	            });
	        }
	        return true;
	    },
	});
	gui.define_popup({name:'sale_order_popup', widget: SaleOrderPopup});


	var SOConfirmPopup = PopupWidget.extend({
	    template: 'SOConfirmPopup',
	    show: function(options){
	       var self = this;
	       this.options = options;
	       this.deliver_products = options.deliver_products;
	       this._super(options);
	    },
	    click_confirm: function(){
	       var self = this;
	       self.gui.show_popup('sale_order_popup', {'sale_order_button': self.options.sale_order_buttonm,'delivery_done':true});
	    },
	});
	gui.define_popup({name:'so_confirm_popup', widget: SOConfirmPopup});

	var SOReturnPopup = PopupWidget.extend({
        template: 'SOReturnPopup',
        show: function(options){
            var self = this;
            this._super();
            this.lines = options.lines || "";
            this.sale_order = options.sale_order || "";
            this.renderElement();
        },
        renderElement: function(){
            var self = this;
            self._super();
            $('.js_return_qty').click(function(ev){
                ev.preventDefault();
                var $link = $(ev.currentTarget);
                var $input = $link.parent().parent().find("input");
                var min = parseFloat($input.data("min") || 1);
                var max = parseFloat($input.data("max") || $input.val());
                var total_qty = parseFloat($input.data("total-qty") || 0);
                var quantity = ($link.has(".fa-minus").length ? -1 : 1) + parseFloat($input.val(),10);
                $input.val(quantity > min ? (quantity < max ? quantity : max) : min);
                $input.change();
                return false;
            });
            $('.remove_line').click(function(event){
                $(this).parent().remove();
            });
        },
        click_confirm: function(){
            var self = this;
            var filter_records = [];
            $(".popup-product-return-list tbody tr").map(function(){
                var id = Number($(this).attr('id'));
                var qty = Number($(".popup-product-return-list tbody tr#"+id+"").find('.js_quantity').val());
                var line = _.find(self.lines, function(obj) { return obj.id == id });
                if(qty && qty > 0 && line){
                    line['return_qty'] = qty;
                    if(line){
                        filter_records.push(line);
                    }
                }
            });
            if(filter_records && filter_records[0]){
                var self = this;
	            var params = {
    				model: 'sale.order',
    				method: 'return_sale_order',
    				args: [filter_records],
    			}
	            rpc.query(params, {async: false}).then(function(result){
                    if(result){
                        alert("Sale order return successfully!");
                        self.gui.close_popup();
                    }
                });
            }
        },
        click_cancel: function(){
            this.gui.close_popup();
        }
    });
    gui.define_popup({name:'sale_return_popup', widget: SOReturnPopup});

    /* Product POPUP */
	var ProductPopup = PopupWidget.extend({
	    template: 'ProductPopup',
	    show: function(options){
	    	var self = this;
			this._super();
			this.order_lines = options.order_lines || false;
			this.order_id = options.order_id || false;
			this.state = options.state || false;
			this.order_screen_obj = options.order_screen_obj || false;
			this.renderElement();
	    },
	    click_confirm: function(){
	        if (this.state == "paid" || this.state == "done"){
	        	$("#re_order_duplicate[data-id='"+ this.order_id +"']").click();
	        } else if(this.state == "draft") {
	        	$("#edit_order[data-id='"+ this.order_id +"']").click();
			}
			this.gui.close_popup();
	    },
    	click_cancel: function(){
    		this.gui.close_popup();
    	}

	});
	gui.define_popup({name:'product_popup', widget: ProductPopup});


});