(function($){ 
     $.fn.extend({
		
         valid8: function(options) {		
            return this.each(function(){
				
				$(this).data('valid', false);
				
				var defaultOptions = {
					regularExpressions: [],
					ajaxRequests: [],
					jsFunctions: [],
					onLoading: defaultOnEvent,
					onValid: defaultOnEvent,
					onError: defaultOnEvent,
					validationEvents: ['keyup','blur'],
					validationFrequency: 1000,
					validationCssClass : '',
					parentErrorSelector : null,
					parentErrorCssClass : 'error',
					parentValidCssClass : 'valid',
					values: null,
					defaultErrorMessage: 'Required'
				};
				
				if(typeof options == 'string')
					defaultOptions.defaultErrorMessage = options;
					
				if(this.type == 'checkbox'){
					defaultOptions.regularExpressions = [{expression: /^true$/, errormessage: defaultOptions.defaultErrorMessage}];
					defaultOptions.validationEvents = ['click'];
				} else
					defaultOptions.regularExpressions = [{expression: /^.+$/, errormessage: defaultOptions.defaultErrorMessage}];
				
				$(this).data('settings', $.extend(defaultOptions, options));
				
				initialize(this);
				
								
			});
		},
		
		isValid: function(){
			var valid = true;
			this.each(function() {
				validate(this);
				if($(this).data('valid') == false)
					valid = false;
			});
			return valid;
		}
		
	});
	
	function initializeDataObject(el){
		$(el).data('loadings', new Array());
		$(el).data('errors', new Array());
		$(el).data('valids', new Array());
		$(el).data('keypressTimer', null);
	}
	
	function initialize(el) {
		initializeDataObject(el);
		if($(el).attr('value').length > 0 && el.type != 'checkbox')
			validate(el);

		activate(el);
	};
	
	function activate(el) {
		var events = $(el).data('settings').validationEvents;
		if(typeof events == 'string')
			$(el)[events](function (e){ handleEvent(e, el); });
		else {
			$.each(events, function(i, event){
				$(el)[event](function (e){ handleEvent(e, el); });
			});
		}
	};
	
	function validate(el) {
		// Dispose old errors and valids
		initializeDataObject(el);

		var value;

		// Handle checkbox
		if(el.type == 'checkbox')
			value = el.checked.toString();
		else
			value = el.value;
				
		regexpValidation(value.replace(/^[ \t]+|[ \t]+$/,''),el);
	};
	
	function regexpValidation(value, el){
		
		$.each($(el).data('settings').regularExpressions, function(i, validator){
			if(!validator.expression.test(value))
				$(el).data('errors')[$(el).data('errors').length] = validator.errormessage;
			else if(validator.validmessage)
				$(el).data('valids')[$(el).data('valids').length] = validator.validmessage;
		});
		
		if($(el).data('errors').length > 0)
			onEvent(el,'error',false);
		else if($(el).data('settings').jsFunctions.length > 0) {
			functionValidation(value, el);
		}
		else if($(el).data('settings').ajaxRequests.length > 0){
			fileValidation(value, el);
		}
		else {
			onEvent(el,'valid',true);
		}
						
	};
	
	function functionValidation(value, el){
			
		$.each($(el).data('settings').jsFunctions, function(i, validator){
			
			var v;
			if(validator.values){
				if(typeof validator.values == 'function')
					v = validator.values();
			}
			
			var values = v || value;
			
			handleLoading(el, validator);
			
			if(validator['function'](values).valid)
				$(el).data('valids')[$(el).data('valids').length] = validator['function'](values).message;
			else
				$(el).data('errors')[$(el).data('errors').length] = validator['function'](values).message;	
		});
		
		if($(el).data('errors').length > 0)
			onEvent(el,'error',false);
		else if($(el).data('settings').ajaxRequests.length > 0) {
			fileValidation(value, el);
		}
		else {
			onEvent(el,'valid',true);
		}
	};
	
	function fileValidation(value, el){
	

		$.each($(el).data('settings').ajaxRequests, function(i, validator){
			
			var v;
			if(validator.values){
				if(typeof validator.values == 'function')
					v = validator.values();
			}
			
			var values = v || {value: value};
			
			handleLoading(el, validator);
			
			$.post(validator.url, values,
			  function(data, textStatus){
				if(data.valid) {
					$(el).data('valids')[$(el).data('valids').length] = data.message;
				} else {
					$(el).data('errors')[$(el).data('errors').length] = data.message;
				}
					if($(el).data('errors').length > 0)
						onEvent(el,'error',false);
					else {
						onEvent(el,'valid',true);
					}
			  }, "json");
		});
		
	};
	
	function handleEvent(e, el){
		if(e.keyCode && $(el).attr('value').length > 0) {
			clearTimeout($(el).data('keypressTimer'));
			$(el).data('keypressTimer',setTimeout(function() {
				validate(el);
			}, $(el).data('settings').validationFrequency));
		}
		else if(e.keyCode && $(el).attr('value').length <= 0)
			return false;
		else {
			validate(el);
		}
		return true;
	};
	
	function handleLoading(el, validator) {
		if(validator.loadingmessage){
			$(el).data('loadings')[$(el).data('loadings').length] = validator.loadingmessage;
			onEvent(el,'loading',false);
		}
	};
	
	function defaultOnEvent(messages, el, event){
		setParentClass(el,event);
		setMessage(messages,el);
	}
	
	function onEvent(el, event, valid) {
		
		var capitalizedEvent = event.substring(0,1).toUpperCase() + event.substring(1,event.length);
		
		$(el).data(event, valid);
		$(el).data('valid', valid);
		$(el).data('settings')['on'+capitalizedEvent]($(el).data(event+'s'),el,event);
	}
	
	function setParentClass(el,className) {
		var errorCssClass = $(el).data('settings').parentErrorCssClass;
		var validCssClass = $(el).data('settings').parentValidCssClass;
		var parentErrorSelector = $(el).data('settings').parentErrorSelector;
		var map = { 'valid' : validCssClass, 'error' : errorCssClass };
		
		var parent = parentErrorSelector ? $(el).parents(parentErrorSelector) : $(el).parent();
		
		parent.removeClass("loading").removeClass(errorCssClass).removeClass(validCssClass).addClass( map[className] ).show();
	}
	
	function setMessage(messages,el) {
		var parent = $(el).parent();
		var elementClass = 'validationMessage';		
		
		var validationMsgElem = parent.find('.'+elementClass);
		if(validationMsgElem.length == 0) {
			validationMsgElem = $('<span class="' + elementClass + ' '+$(el).data('settings').validationCssClass+'"></span>');
			parent.append(validationMsgElem);
		}

		validationMsgElem.html("");
		if (messages.length>0 && messages[0]!=null && messages[0]!='')
			validationMsgElem.text(messages[0]).show();
		else
			validationMsgElem.hide();
	}
	
})(jQuery);