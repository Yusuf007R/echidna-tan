export interface RunpodRes<T> {
  delayTime:     number;
  executionTime: number;
  id:            string;
  output:        T;
  status:        string;
}

export interface Txt2img {
  images:     string[];
  info:       string;
  parameters: Parameters;
}

export interface Parameters {
  alwayson_scripts:                     any;
  batch_size:                           number;
  cfg_scale:                            number;
  denoising_strength:                   number;
  do_not_save_grid:                     boolean;
  do_not_save_samples:                  boolean;
  enable_hr:                            boolean;
  eta:                                  null;
  firstphase_height:                    number;
  firstphase_width:                     number;
  height:                               number;
  hr_resize_x:                          number;
  hr_resize_y:                          number;
  hr_scale:                             number;
  hr_second_pass_steps:                 number;
  hr_upscaler:                          string;
  n_iter:                               number;
  negative_prompt:                      string;
  override_settings:                    null;
  override_settings_restore_afterwards: boolean;
  prompt:                               string;
  restore_faces:                        boolean;
  s_churn:                              number;
  s_min_uncond:                         number;
  s_noise:                              number;
  s_tmax:                               null;
  s_tmin:                               number;
  sampler_index:                        string;
  sampler_name:                         null;
  save_images:                          boolean;
  script_args:                          any[];
  script_name:                          null;
  seed:                                 number;
  seed_resize_from_h:                   number;
  seed_resize_from_w:                   number;
  send_images:                          boolean;
  steps:                                number;
  styles:                               null;
  subseed:                              number;
  subseed_strength:                     number;
  tiling:                               boolean;
  width:                                number;
}