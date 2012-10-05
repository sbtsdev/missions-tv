/*
 * TODO
 *		Add transition types or options, especially CSS transitions
 */
(function ($, win) {
	var current_img,			// current_img file name
		image_timeout, stats_timeout, // keep the timeout identifiers so we can cancel them
		current_world_pop, current_ureach_pop,	// current populations
		template,				// page template specifics
		settings,				// initial settings (retrieved each time through the loop?)
		reset,
		dt;						// the date/time of the last time the loop ran

	function load_settings(nset) {
		nset = nset || {};
		// assume settings at this point, later retrieve them from the server, offer them to the user to modify, save to server and launch
		settings = settings || {
			'image_delay'	: 8000,
			'image_easing'	: 'easeInQuad', // http://easings.net
			'image_move_time'	: 1500,
			'stats_delay'	: 1000,
			// these next two are the world and unreached base populations taken at certain times with a certain growth rate
			'base_world'	: {
								'time'	: new Date(2012, 9, 2, 13, 43, 0), // month is zero based
								'pop'	: 7043122856,
								'rate'	: 2.45
							},
			'base_ureach'	: {
								'time'	: new Date(1999, 4, 4, 0, 0, 0),
								'pop'	: 2989262347,
								'rate'	: 1.394
							}
		};
		$.extend(settings, nset);
		reset = false;
	}

	// get settings from the user, initial image, images to skip, date/time settings, etc. (all need to be saved to the server at some point)
	//	saving settings on the server will allow two instances of this to be brought up, one to display the images and then while its running
	//	another can be set up to alter the settings
	function load_page() {
		/* Set the wider variables here so we can reset at any point */
		current_img	= '';
		current_world_pop = 0;
		current_ureach_pop = 0;
		template = {
			'image_wrap'		: 'image-wrap', // jquery reference to wrapper for all images
			'image_loc'			: 'image',		// jquery reference to image area
			'stats_loc_world'	: 'world-pop',	// jquery reference to stats area
			'stats_loc_ureach'	: 'ureach-pop',	// jquery reference to stats area
			'image_height'		: 0.71
		};
		dt = new Date();			// the date/time of the last time the loop ran
		if (image_timeout) {
			clearTimeout(image_timeout);
		}
		if (stats_timeout) {
			clearTimeout(stats_timeout);
		}
		load_settings();

		// later this will be initiated via a button on the settings screen
		launch_auto_updates();
	}

	function launch_auto_updates() {
		update_image();
		update_stats();
	}

	// update the screen at the proper time
	function update_image() {
		if (!reset) {
			get_next_image(display_image);
			image_timeout = setTimeout(update_image, settings.image_delay);
		}
	}

	function update_stats() {
		if (!reset) {
			get_next_stats(display_stats);
			stats_timeout = setTimeout(update_stats, settings.stats_delay);
		}
	}

	// pass the current_img image to the server via ajax to retrieve the next image
	function get_next_image(image_ready_func) {
		/* assume images for now, do ajax later
			var num = parseInt(current_img.substr(-5,1), 10), next_num = num + 1 > 7 ? 1 : num + 1;
			current_img = current_img ? current_img.substr(0, current_img.indexOf('.') - 1) + next_num + '.jpg' : 'uploads/test1.jpg';
			// when the -future- ajax call returns, call the function to display
			image_ready_func();
		*/
		$.ajax({
			'url'	: 'ws/files.php',
			'dataType'	:	'json',
			'data'		:	{
							'action'	: 'get_next',
							'from'		: 'web',
							'current'	: current_img
			},
			'success'	:	function (rjson) {
								if (rjson && rjson.reset) {
									reset = true;
									load_settings(rjson.settings); // reset everything
								}else if (rjson && rjson.reload) {
									win.location.reload();
								} else {
									if (rjson && rjson.success) {
										current_img = rjson.next;
										image_ready_func();
									} else {
										next_image_failed(image_ready_func);
									}
								}
			},
			'error'		:	function (jqXHR, textStatus, errorThrown) {
								next_image_failed(image_ready_func);
			}
		});
	}

	function get_next_stats(stats_ready_func) {
		update_js_dt();
		current_world_pop = Math.round((dt.getTime() - settings.base_world.time.getTime()) / 1000 * settings.base_world.rate) + settings.base_world.pop;
		current_ureach_pop = Math.round((dt.getTime() - settings.base_world.time.getTime()) / 1000 * settings.base_ureach.rate) + settings.base_ureach.pop;
		stats_ready_func();
	}

	function next_image_failed(image_ready_func) {
		var prev_img = $('.'+template.image_loc).first().attr('src');
		if (prev_img) {
			current_img = prev_img;
			image_ready_func();
		}
	}

	// display the image - straight replace, random transition, css transition, according to the settings, etc.
	// TODO
	//		Add setting to dictate what type of easing to do (currently set to 'easeInOutBack')
	//		Add setting to dictate where the currently viewed image moves to: up, down, left, right
	//		Move the current_img implementation out to a function that will allow the same function to dictate where the current_img image moves
	function display_image() {
		var ht, jq_new_img;
		jq_new_img = $(document.createElement('div'))
						.addClass(template.image_loc)
						.append('<img src="' + current_img + '" width="' + win.innerWidth + '" height="' + (win.innerHeight * template.image_height) + '" />' )
						.appendTo('.'+template.image_wrap);
		ht = jq_new_img.outerHeight(true);
		if ($('.'+template.image_loc).length > 1) {
			$('.'+template.image_wrap).animate({ top: '-=' + ht + 'px' }, settings.image_move_time, settings.image_easing, function () {
				if ($('.'+template.image_loc).length > 3) {
					var first_img = $(this).children('.'+template.image_loc).first(),
						rm_ht = parseInt($(this).css('top'), 10) + first_img.outerHeight(true); // add because top is negative and we want it to go to zero
					first_img.remove(); // remove (1), it's off screen now
					$(this).css('top', rm_ht); // reset the top to the new top-most image, which is the first one in the hidden space above the visible one
				}
			});
		}
	}

	function format_large_number(num) {
		var nnum_str = num += '', rgx = /(\d+)(\d{3})/;
		while (rgx.test(nnum_str)) {
			nnum_str = nnum_str.replace(rgx, '$1' + ',' + '$2');
		}
		return nnum_str;
	}

	function display_stats() {
		$('.'+template.stats_loc_world).text(format_large_number(current_world_pop));
		$('.'+template.stats_loc_ureach).text(format_large_number(current_ureach_pop));
	}

	// update the date/time to compare with settings, etc.
	function update_js_dt() {
		dt = new Date();
	}

	// start the whole thing going
	load_page();
}(jQuery, window));
