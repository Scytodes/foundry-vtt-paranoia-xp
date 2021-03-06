/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ParanoiaXPActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["paranoia_xp", "sheet", "actor"],
      template: "systems/paranoia_xp/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.config=CONFIG.PARANOIA_XP;
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items.
    if (this.actor.data.type == 'character') {
      this._prepareCharacterItems(data);
    }

    return data;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const gear_personal = [];
    const gear_assigned =[];
    const gear_treasonous =[];
    const gear_unassigned=[];
    const skills = [];


    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item' || i.type==='weapon') {
        switch (i.data.type){
          case "personal":
            gear_personal.push(i);
            break;
          case "assigned":
            gear_assigned.push(i);
            break;
          case "treasonous":
            gear_treasonous.push(i);
            break;
          default:
            //any data that is corrupted put here to be deleted or fixed
            gear_unassigned.push(i);
        }

      }


      // Append to skills
      else if (i.type === 'skill') {
        /**
          * TODO
          *  Divide skills by:
          *  skill_type
          *  abilities
          *  double check secret skills with attributes are handled correctly
          *
          */

        skills.push(i);
      }

      }


    // Assign and return
    actorData.gear_personal = gear_personal;
    actorData.gear_assigned = gear_assigned;
    actorData.gear_treasonous = gear_treasonous;
    actorData.gear_unassigned = gear_unassigned;
    actorData.skill = skills;

  }

  /* -------------------------------------------- */


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);


    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
    html.find('.name_string').on("change name_string",this._onNameChange(this));

  }


  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.data.data);
      let label = dataset.label ? `Rolling ${dataset.label}` : '';
      roll.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }

  /**
   * Handle automatic name compilation
   */
  _onNameChange(event) {
    //add in base name
    const data=this.actor.data.data
    let name=data.basename;
    if (name === undefined || name === null) {
      this.actor.update({"data.basename": this.actor.name});
      name=this.actor.name;
    }
    name += "-" + game.i18n.format(CONFIG.PARANOIA_XP.security_levels_short[data.clearance]);

    //add in sector and clones
    name += "-" + data.sector + "-" + data.clone.value;

    this._setSecurityUI();
    return this.actor.update({"name": name});

  }

  /**
   * Handle security ui changes
   * @private
   */
  _setSecurityUI(){
    let sec_level=this.actor.data.data.clearance;
    let sec_class=CONFIG.PARANOIA_XP.security_levels_css[sec_level];
    let window=this.element[0].children[0];
    let scrollbar=this.element[0].children[1];
    //remove old security class
    for (const [sl, value] of Object.entries(CONFIG.PARANOIA_XP.security_levels_css)){
      window.classList.remove(value)
      scrollbar.classList.remove(value+"_sb");
    }
    window.classList.add(sec_class);
    scrollbar.classList.add(sec_class+"_sb");
    return sec_class;

  }

}
