<template>
  <v-dialog :value="show" max-width="600px" @input="$emit('cancel')" scrollable>
    <v-card>
      <v-card-title>
        <span class="headline mx-0" v-if="!isEditing">Add Capability</span>
        <span class="headline mx-0" v-if="isEditing">Edit Capability</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="CapabilityForm" lazy-validation @submit.prevent>
          <v-text-field v-model="schema" :rules="nameRules" label="Capability" />
          <v-expansion-panels light>
            <v-expansion-panel class="px-2">
              <v-expansion-panel-header>Parameters</v-expansion-panel-header>
              <v-expansion-panel-content>
                <v-text-field
                  v-model="curParameter.schema"
                  clearable
                  label="Kind of Parameter"
                  required
                />
                <v-text-field v-model="curParameter.type" clearable label="Data Type" />
                <v-text-field v-model="curParameter.unit" clearable label="Unit" />
                <v-text-field v-model="curParameter.encoding" clearable label="Encoding" />
                <v-text-field v-model="curParameter.default" clearable label="Default Value" />
                <v-expansion-panels light>
                  <v-expansion-panel class="px-2">
                    <v-expansion-panel-header>Validators</v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-text-field v-model="validator.type" clearable label="Type" required />
                      <v-text-field v-model="validator.rule" clearable label="Rule" />
                      <v-btn class="mb-3" small @click="addValidator()">Add Validator</v-btn>
                      <v-divider />
                      <template v-for="(v, index) in curParameter.validators">
                        <v-row align="center" :key="index + 'key'">
                          <v-col class="align" :shrink="true">
                            <v-chip :id="v.type" :key="index">{{ v.type }}: {{ v.rule }}</v-chip>
                          </v-col>
                          <v-icon
                            color="error"
                            :key="index + 'delete'"
                            :id="v"
                            @click="deleteValidator(v)"
                          >
                            mdi-delete
                          </v-icon>
                        </v-row>
                      </template>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
                <v-checkbox v-model="curParameter.required" label="Required"></v-checkbox>

                <v-btn class="mb-3" v-if="!parameterEditing" small @click="addParameter()">
                  Add Parameter
                </v-btn>
                <v-btn class="mb-3" v-if="parameterEditing" small @click="saveParameterChanges()">
                  Save Changes
                </v-btn>
                <v-btn
                  class="mb-3"
                  v-if="parameterEditing"
                  small
                  color="error"
                  @click="
                    parameterEditing = false;
                    resetCurParameter();
                  "
                >
                  Cancel
                </v-btn>
                <v-divider />
                <template v-for="(parameter, index) in parameters">
                  <v-row align="center" :key="index + 'key'">
                    <v-col class="align" :shrink="true">
                      <v-chip :id="parameter.kindOfParameter" :key="index">
                        {{ getLabel(parameter) }}
                      </v-chip>
                    </v-col>
                    <v-icon
                      class="ml-3"
                      color="primary"
                      :key="index + 'update'"
                      :id="parameter"
                      @click="editExistingParameter(parameter)"
                    >
                      mdi-pencil
                    </v-icon>
                    <v-icon
                      color="error"
                      :key="index + 'delete'"
                      :id="parameter"
                      @click="deleteParameter(parameter)"
                    >
                      mdi-delete
                    </v-icon>
                  </v-row>
                </template>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn small @click="$emit('cancel')">Cancel</v-btn>
        <v-btn color="primary" v-if="!isEditing" small @click="add">Add</v-btn>
        <v-btn color="primary" v-if="isEditing" small @click="update">Update</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'CapabilityForm',
  props: {
    capability: {
      type: Object,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      nameRules: [(n) => !!n || 'Name is required'],
      parameterEditing: false,
      validatorEditing: false,
      editParameter: null,

      schema: this.capability ? this.capability.schema : '',
      parameters: this.capability ? JSON.parse(JSON.stringify(this.capability.parameters)) : [],
      curParameter: {
        schema: '',
        name: '',
        type: '',
        unit: '',
        encoding: '',
        default: '',
        required: '',
        validators: [],
      },
      validator: {
        type: '',
        rule: '',
      },
    };
  },
  computed: {
    isEditing() {
      return !!this.capability;
    },
  },
  methods: {
    add() {
      this.$emit('add', {
        schema: this.schema,
        name: this.schema.split('/').pop(),
        parameters: this.parameters,
        machineIds: [],
      });
    },
    update() {
      this.$emit('update', {
        id: this.capability.id,
        schema: this.schema,
        name: this.schema.split('/').pop(),
        parameters: this.parameters,
        machineIds: this.capability.machineIds,
      });
    },
    /**
     * Add the parameter from the input fields to the array of parameters
     */
    addParameter() {
      if (this.curParameter.schema) {
        this.curParameter.name = this.curParameter.schema.split('/').pop();
        this.parameters.push(this.curParameter);
      }
      this.resetCurParameter();
    },
    addValidator() {
      if (!this.curParameter.validators) {
        this.curParameter.validators = [];
      }
      if (this.validator.type && this.validator.rule) {
        this.curParameter.validators.push(this.validator);
        this.validator = {
          type: '',
          rule: '',
        };
      }
    },
    /**
     * delete parameter, will be reversed if the edit capability action is cancelled
     */
    deleteParameter(parameterToRemove) {
      this.parameters = this.parameters.filter((parameter) => parameter !== parameterToRemove);
    },
    deleteValidator(validatorToRemove) {
      this.curParameter.validators = this.curParameter.validators.filter(
        (v) => v !== validatorToRemove
      );
    },
    /**
     * display  info about added parameters nicely
     */
    getLabel(parameter) {
      let validatorLabel = '';
      parameter.validators.forEach((v) => {
        validatorLabel = validatorLabel.concat(`, ${v.type.toString()}: ${v.rule}`);
      });
      return `${parameter.name} (${parameter.type ? parameter.type : 'Data Type: no info'}, ${
        parameter.unit ? parameter.unit : 'Unit: no info'
      }, ${parameter.encoding ? parameter.encoding : 'Encoding: no info'}, ${
        parameter.default ? parameter.default : 'Default Value: no info'
      }${parameter.required ? ', Required' : ''}${validatorLabel})`;
    },
    /**
     * @param parameter the parameter to be edited
     * put parameter in editing mode and fill in the input fields with its properties
     * assign parameter to the parameter that is currently being edited
     */
    editExistingParameter(parameter) {
      this.editParameter = parameter;
      this.curParameter = Object.assign({}, this.editParameter);
      this.parameterEditing = true;
    },
    /**
     * Clear input fields
     */
    resetCurParameter() {
      this.curParameter = {
        schema: '',
        name: '',
        type: '',
        unit: '',
        encoding: '',
        default: '',
        required: '',
        validators: [],
      };
    },
    /**
     * Save the changes to the edited parameter and remove from editing mode
     */
    saveParameterChanges() {
      Object.assign(this.editParameter, this.curParameter);
      this.resetCurParameter();
      this.parameterEditing = false;
    },
  },
};
</script>
